"use strict";

import Parser from "./parser.js";
import Work from "./work.js";
import Node from "./node.js";
import ChromeWorkStorage from "./chrome_work_storage.js";
import FirebaseWorkStorage from "./firebase_work_storage.js";
import LocalWorkStorage from "./local_work_storage.js";

class Newtab {

  constructor() {
    this.useFirebase = false;
    this.typing = false;
    this.loading = false;
    this.timer = false;

    this.showStatusMessage("Initialiing...");

    this.chromeWorkStorage = new ChromeWorkStorage(this);
    this.firebaseWorkStorage = new FirebaseWorkStorage(this);
    this.localWorkStorage = new LocalWorkStorage(this);
    this.localWorkStorage.initialize(() => {
      this.chromeWorkStorage.initialize(() => {
        this.firebaseWorkStorage.initialize(alreadyLoggedIn => {
          this.currentWork = Work.newInstance();
          this.editor = this.initializeAceEditor();
          this.calendar = this.initializeCalendar();
          this.changeUseFirebase(alreadyLoggedIn);
          this.setConfigrationToUI();
          this.assignEventHandlers();
          this.loadWorkList();
          this.changeLayoutVisibility();
          this.showStatusMessage("Initialized.");
        });
      });
    });
  }

  // Ace Editor

  initializeAceEditor() {
    //config reference: https://github.com/ajaxorg/ace/Readme.md
    this.showStatusMessage("Initializing Ace Editor.");

    let editor = ace.edit("source");
    // editor.setFontSize(13);
    //fontFamily: "MeiryoKe_Gothic, \"Courier New\", Courier, Monaco, Mento, monospace",
    editor.setOptions({
      fontFamily: "\"Roboto Mono\", Consolas, Courier, Monaco, Mento, monospace",
      fontSize: "14px"
    });
    editor.setDisplayIndentGuides(true);
    editor.getSession().setTabSize(4);
    editor.getSession().setUseSoftTabs(false);
    editor.getSession().setUseWrapMode(false);
    editor.setShowPrintMargin(false);
    editor.setHighlightActiveLine(true);
    editor.renderer.setShowGutter(false);
    editor.$blockScrolling = Infinity;
    var LanguageMode = ace.require("ace/mode/python").Mode;
    editor.getSession().setMode(new LanguageMode());
    editor.setTheme("ace/theme/eclipse");

    this.showStatusMessage("Initialized Ace Editor.");

    return editor;
  }

  // Calendar

  initializeCalendar() {
    return $("#calendar").fullCalendar({
      defaultView: "month",
      displayEventTime: false,
      eventTextColor: "white",
      eventBackgroundColor: "#2196F3",
      eventRender: (event, element) => {
        element.attr("title", event.title);
      }
    }).fullCalendar("getCalendar");
  }

  // Event Handlers

  assignEventHandlers() {
    this.showStatusMessage("Assigning event handlers.");

    this.editor.getSession().on("change", () => {
      this.onEditorSessionChanged();
    });
    this.editor.getSession().getSelection().on("changeSelection", () => {
      this.onEditorSelectionChanged();
    });

    ["btnDelete", "btnConfirmYes",
     "btnCopyAsPlainText", "btnCopyAsMarkdownText", "btnOnline",
     "btnLogin", "btnOpenCreateUserDialog", "btnCreateUser",
     "btnForgotPassword",
     "btnLayoutRightMain", "btnLayoutLeftMain", "btnLayoutRightOnly",
     "btnLayoutLeftOnly", "btnCopyAsHtmlText"].forEach(name => {
      let element = document.querySelector("#" + name);
      element.addEventListener("click", () => {
        this.hideNavbar();
        this["on" + name.charAt(0).toUpperCase() + name.slice(1) + "Clicked"]();
      });
    });

    ["footerBtnLayoutRightMain", "footerBtnLayoutLeftMain", "footerBtnLayoutRightOnly",
      "footerBtnLayoutLeftOnly"].forEach(name => {
      let element = document.querySelector("#" + name);
      element.addEventListener("click", () => {
        this.hideNavbar();
        this["on" + name.charAt(6).toUpperCase() + name.slice(7) + "Clicked"]();
      });
    });

    $("#loginDialog").on("shown.bs.modal", () => {
      $("#inputEmail").focus();
    });

    $("#createUserDialog").on("shown.bs.modal", () => {
      $("#inputNewEmail").focus();
    });

    const visibilityDivs = {
      "xs": $("<div class=\"d-xs-block d-sm-none d-md-none d-lg-none d-xl-none\"></div>"),
      "sm": $("<div class=\"d-none d-sm-block d-md-none d-lg-none d-xl-none\"></div>"),
      "md": $("<div class=\"d-none d-md-block d-sm-none d-lg-none d-xl-none\"></div>"),
      "lg": $("<div class=\"d-none d-lg-block d-sm-none d-md-none d-xl-none\"></div>"),
      "xl": $("<div class=\"d-none d-xl-block d-sm-none d-md-none d-lg-none\"></div>")
    };

    ResponsiveBootstrapToolkit.use("custom", visibilityDivs);

    $(window).resize(ResponsiveBootstrapToolkit.changed(() => {
      this.changeLayoutVisibility();
    }));

    this.showStatusMessage("Assigned event handlers.");
  }

  changeLayoutVisibility() {
    if (ResponsiveBootstrapToolkit.is("<=md")) {
      $("#btnLayoutRightMain").hide();
      $("#btnLayoutLeftMain").hide();
      $("#footerBtnLayoutRightMain").hide();
      $("#footerBtnLayoutLeftMain").hide();
      const leftColumn = document.querySelector("#leftColumn");
      const rightColumn = document.querySelector("#rightColumn");
      const leftClassName = leftColumn.getAttribute("class");
      if (leftClassName.includes("-8") || leftClassName.includes("-12")) {
        leftColumn.setAttribute("class", "d-block col-lg-12");
        rightColumn.setAttribute("class", "d-none");
      } else {
        leftColumn.setAttribute("class", "d-none");
        rightColumn.setAttribute("class", "d-block col-lg-12");
      }
    } else {
      $("#btnLayoutRightMain").show();
      $("#btnLayoutLeftMain").show();
      $("#footerBtnLayoutRightMain").show();
      $("#footerBtnLayoutLeftMain").show();
    }
  }

  onBtnLayoutRightMainClicked() {
    let leftColumn = document.querySelector("#leftColumn");
    let rightColumn = document.querySelector("#rightColumn");
    leftColumn.setAttribute("class", "d-block col-lg-4");
    rightColumn.setAttribute("class", "d-block col-lg-8");
  }

  onBtnLayoutLeftMainClicked() {
    let leftColumn = document.querySelector("#leftColumn");
    let rightColumn = document.querySelector("#rightColumn");
    leftColumn.setAttribute("class", "d-block col-lg-8");
    rightColumn.setAttribute("class", "d-block col-lg-4");
  }

  onBtnLayoutRightOnlyClicked() {
    let leftColumn = document.querySelector("#leftColumn");
    let rightColumn = document.querySelector("#rightColumn");
    leftColumn.setAttribute("class", "d-none");
    rightColumn.setAttribute("class", "d-block col-lg-12");
  }

  onBtnLayoutLeftOnlyClicked() {
    let leftColumn = document.querySelector("#leftColumn");
    let rightColumn = document.querySelector("#rightColumn");
    leftColumn.setAttribute("class", "d-block col-lg-12");
    rightColumn.setAttribute("class", "d-none");
  }

  onEditorSessionChanged() {
    if (this.timer !== false) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      this.showStatusMessage("Editor session changed.");
      this.typing = true;
      this.drawDiagram(() => {
        if (!this.loading) {
          this.showStatusMessage("Saving the content.");
          this.getWorkStorage().save(this.currentWork, () => {
            this.showStatusMessage("Saved the content.");
            this.loadWorkList(() => {
              this.timer = false;
              this.showStatusMessage("Saved and reloaded.");
            });
          });
        }
      });
    }, 2000);
  }

  onEditorSelectionChanged() {
    const selectionRange = this.editor.getSelectionRange();
    const textRange = this.editor.getSession().getTextRange(selectionRange);
    if (textRange.length > 0) {
      $(".dropdownEditItem").removeClass("disabled");
    } else {
      $(".dropdownEditItem").addClass("disabled");
    }
  }

  onBtnLastClicked() {
    this.getWorkStorage().getLast(work => {
      this.load(work);
      this.showStatusMessage("Last diagram loaded.");
    });
  }

  onBtnDeleteClicked() {
    if (this.currentWork.content) {
      let confirmMessage = document.querySelector("#confirmMessage");
      confirmMessage.innerText = "Do you really want to delete `" + this.currentWork.firstLine + "`?";
      $("#confirmDialog").modal("show");
    }
  }

  onBtnConfirmYesClicked() {
    $("#confirmDialog").modal("hide");
    if (this.currentWork.content) {
      this.showStatusMessage("Removing.");

      this.getWorkStorage().remove(this.currentWork, () => {
        this.loadWorkList(() => {
          this.load(Work.newInstance());

          this.showStatusMessage("Removed and reloaded.");
        });
      });
    }
  }

  onBtnNewClicked() {
    this.load(Work.newInstance());

    this.showStatusMessage("New diagram created.");
  }

  onBtnTopSitesClicked() {
    let text = "Top Sites\n";
    chrome.topSites.get(sites => {
      sites.forEach(site => {
        text = text + "\t[" + site.title + "](" + site.url + ")\n";
      });
      let work = new Work(Date.now(), text, Date.now());
      work.isSave = false;
      this.load(work);

      this.showStatusMessage("Top sites loaded.");
    });
  }

  onBtnHowToUseClicked() {
    let text = "";
    text = "Diagram Tab\n\tAbout\n\t\tCopyright (C) 2019-${year} Khanh Le\n\t\tAll rights reserved\n";
    text = text.replace("${year}", new Date().getFullYear());
    const work = new Work(Date.now(), text, Date.now());
    work.isSave = false;
    this.load(work);

    this.showStatusMessage("How to Use loaded.");
  }

  onBtnForgotPasswordClicked() {
    this.updateLoginErrorMessage("");
    const email = document.querySelector("#inputEmail").value;
    this.firebaseWorkStorage.sendPasswordResetEmail(email, () => {
      this.updateLoginErrorMessage("Sent an email to the address.");
    }, error => {
      console.error(error);
      this.updateLoginErrorMessage(error.message);
    });
  }

  onBtnCreateUserClicked() {
    this.updateCreateUserErrorMessage("");
    const email = document.querySelector("#inputNewEmail").value;
    const password1 = document.querySelector("#inputNewPassword1").value;
    const password2 = document.querySelector("#inputNewPassword2").value;
    if (password1 && password1 === password2) {
      this.firebaseWorkStorage.createUser(email, password1, () => {
        this.changeUseFirebase(true);
        this.loadWorkList(() => {
          this.load(Work.newInstance());
          $("#createUserDialog").modal("hide");
        });
      }, error => {
        console.error(error);
        this.updateCreateUserErrorMessage(error.message);
      });
    } else {
      this.updateCreateUserErrorMessage("Invalid password.");
    }
  }

  onBtnOpenCreateUserDialogClicked() {
    $("#loginDialog").modal("hide");
    this.updateCreateUserErrorMessage("");
    document.querySelector("#inputNewEmail").value = document.querySelector("#inputEmail").value;
    document.querySelector("#inputNewPassword1").value = "";
    document.querySelector("#inputNewPassword2").value = "";
    $("#createUserDialog").modal("show");
  }

  onBtnOnlineClicked() {
    if (this.useFirebase) {
      this.showStatusMessage("Logging out.");

      this.getWorkStorage().logout(() => {
        this.changeUseFirebase(false);
        this.loadWorkList(() => {
          this.load(Work.newInstance());

          this.showStatusMessage("Logged out and reloaded.");
        });
      });
    } else {
      document.querySelector("#inputPassword").value = "";
      this.updateLoginErrorMessage("");
      $("#loginDialog").modal("show");
    }
  }

  onBtnLoginClicked() {
    this.updateLoginErrorMessage("");
    const email = document.querySelector("#inputEmail").value;
    const passwd = document.querySelector("#inputPassword").value;

    this.showStatusMessage("Logging in.");

    this.firebaseWorkStorage.login(email, passwd, () => {
      this.changeUseFirebase(true);
      this.loadWorkList(() => {
        this.load(Work.newInstance());
        $("#loginDialog").modal("hide");

        this.showStatusMessage("Logged in.");
      });
    }, error => {
      console.error(error);
      this.updateLoginErrorMessage(error.message);
    });
  }

  onBtnCopyAsPlainTextClicked() {
    let source = this.editor.getValue();
    if (source) {
      this.copyTextToClipboardViaCopyBuffer(source);
    }
  }

  onBtnCopyAsMarkdownTextClicked() {
    let source = this.editor.getValue();
    let root = new Parser().parse(source, this.isFilterStrikeThroughText());
    if (root) {
      let text = "";
      let traverse = (node, currentLevel) => {
        for (let i = 0; i < currentLevel; i += 1) {
          text += "  ";
        }
        text += "* " + node.source + "\n";
        if (!node.isLeaf()) {
          node.children.forEach(child => {
            traverse(child, currentLevel + 1);
          });
        }
      };
      traverse(root, 0);
      this.copyTextToClipboardViaCopyBuffer(text);
    }
  }

  onBtnCopyAsHtmlTextClicked() {
    let source = this.editor.getValue();
    let root = new Parser().parse(source, this.isFilterStrikeThroughText());
    if (root) {
      let text = "<ul>\n";
      let traverse = (node, currentLevel) => {
        for (let i = 0; i < currentLevel; i += 1) {
          text += "  ";
        }
        text += "<li>" + node.html;
        if (!node.isLeaf()) {
          currentLevel += 1;
          text += "\n";
          for (let i = 0; i < currentLevel; i += 1) {
            text += "  ";
          }
          text += "<ul>\n";
          node.children.forEach(child => {
            traverse(child, currentLevel + 1);
          });
          for (let i = 0; i < currentLevel; i += 1) {
            text += "  ";
          }
          text += "</ul>\n";
          currentLevel -= 1;
          for (let i = 0; i < currentLevel; i += 1) {
            text += "  ";
          }
        }
        text += "</li>\n";
      };
      traverse(root, 1);
      text += "</ul>"
      this.copyTextToClipboardViaCopyBuffer(text);
    }
  }

  // Calendar
  renderEvents() {
    const source = this.editor.getValue();
    const root = new Parser().parse(source, this.isFilterStrikeThroughText());
    const eventSource = [];
    if (root) {
      Node.visit(root, node => {
        const m = node.source.match(/(\d{4}\/)?\d{1,2}\/\d{1,2}/);
        if (m) {
          let date = m[0];
          if (date.split("/").length - 1 === 1) {
            date = `${new Date().getFullYear()}/${date}`;
          }
          eventSource.push({
            title: this.createEventTitle(node),
            start: new Date(`${date} 00:00:00`)
          })
        }
      });
    }
    this.calendar.removeEventSources();
    this.calendar.addEventSource(eventSource);
  }

  createEventTitle(node) {
    let target = node;
    let result = [];
    do {
      result.push(target.source.replace(/~/g, "").replace(/\*/g, ""));
      target = target.parent;
    } while(target !== null && target.parent !== null);
    return result.reverse().join(" ");
  }

  // Update messages

  updateLoginErrorMessage(message) {
    const loginErrorMessage = document.querySelector("#loginErrorMessage");
    if (message) {
      loginErrorMessage.innerText = message;
    } else {
      loginErrorMessage.innerText = "";
    }
  }

  updateCreateUserErrorMessage(message) {
    const createUserErrorMessage = document.querySelector("#createUserErrorMessage");
    if (message) {
      createUserErrorMessage.innerText = message;
    } else {
      createUserErrorMessage.innerText = "";
    }
  }

  // For Firebase

  changeUseFirebase(alreadyLoggedIn) {
    this.useFirebase = alreadyLoggedIn;
    this.updateBtnOnlineText();
  }

  getWorkStorage() {
    if (this.useFirebase) {
      return this.firebaseWorkStorage;
    } else if (window.chrome !== undefined && chrome.storage !== undefined) {
      return this.chromeWorkStorage;
    } else {
      return this.localWorkStorage;
    }
  }

  onWorkAdded() {
    this.showStatusMessage("Diagram added message received.");
    this.loadWorkList(() => {
      this.typing = false;

      this.showStatusMessage("Handled diagram added message and reloaded.");
    });
  }

  onWorkChanged(key, changedWork) {
    this.showStatusMessage("Diagram changed message received.");
    this.loadWorkList(() => {
      if (!this.typing
        && this.currentWork
        && this.currentWork.created === changedWork.created
        && this.currentWork.content !== changedWork.content) {
        this.load(changedWork);
      }
      this.typing = false;

      this.showStatusMessage("Handled diagram changed message and reloaded.");
    });
  }

  onWorkRemoved(key, removedWork) {
    this.showStatusMessage("Diagram removed message received.");
    this.loadWorkList(() => {
      if (this.currentWork
        && this.currentWork.created === removedWork.created) {
        this.load(Work.newInstance());
      }
      this.typing = false;

      this.showStatusMessage("Handled diagram removed message and reloaded.");
    });
  }

  updateBtnOnlineText() {
    if (this.useFirebase) {
      const email = this.firebaseWorkStorage.getCurrentUserEmail();
      document.querySelector("#lblOnline").innerText = email;
      document.querySelector("#lblOnlineAction").innerText = "Logout";
    } else {
      document.querySelector("#lblOnline").innerText = "(offline)";
      document.querySelector("#lblOnlineAction").innerText = "Login / Sign-in";
    }
  }

  // For Clipboard

  copyTextToClipboardViaCopyBuffer(text) {
    const copyBuffer = document.querySelector("#copyBuffer");
    copyBuffer.value = text;
    copyBuffer.select();
    try {
      const result = document.execCommand("copy");
      const msg = result ? "successful" : "unsuccessful";
      console.log("Copy source text was " + msg);
    } catch (e) {
      console.log("Oops, unable to copy");
    }
  }

  // Draw MindMap

  drawDiagram(callback) {
    let source = this.editor.getValue();
    this.currentWork.content = source;
    $("div.mermaid").text(source);
    $("div.mermaid").removeAttr("data-processed");
    if(source !== "") {
      try {
        window.mermaid.init();
      } catch (error) {
        this.showStatusMessage("Wrong syntax");
      }
    }
    if (callback) {
      callback();
    }
  }

  appendDividerTo(parent) {
    const separator = document.createElement("div");
    separator.setAttribute("class", "dropdown-divider");
    parent.appendChild(separator);
}

  loadWorkList(callback) {
    this.showStatusMessage("Loading diagrams.");

    this.getWorkStorage().getAll(works => {
      let history = document.querySelector("#history");
      history.innerHTML = "";
      const newLink = document.createElement("a");
      newLink.href = "#";
      newLink.setAttribute("class", "dropdown-item");
      newLink.appendChild(document.createTextNode("New"));
      newLink.addEventListener("click", () => {
        this.hideNavbar();
        this.onBtnNewClicked();
      });
      history.appendChild(newLink);
      if (works.length > 0) {
        this.appendDividerTo(history);
      }
      works.forEach(work => {
        const link = document.createElement("a");
        link.href = "#";
        link.setAttribute("class", "dropdown-item");
        const label = work.firstLine;
        link.appendChild(document.createTextNode(label));
        link.appendChild(document.createElement("br"));
        const date = document.createElement("span");
        date.setAttribute("class", "date");
        date.appendChild(document.createTextNode("(" + this.toLocaleString(new Date(work.created)) + ")"))
        link.appendChild(date);
        link.addEventListener("click", (x => {
          return () => {
            this.hideNavbar();
            this.load(x);
          };
        })(work));
        history.appendChild(link);
      });
      if (works.length > 0) {
        this.appendDividerTo(history);
        const lastA = document.createElement("a");
        lastA.href = "#";
        lastA.setAttribute("class", "dropdown-item");
        lastA.innerText = "Last";
        lastA.addEventListener("click", () => {
          this.hideNavbar();
          this.onBtnLastClicked();
        });
        history.appendChild(lastA);
      }
      if (this.getWorkStorage().canProvideTopSites()) {
        const topSitesA = document.createElement("a");
        topSitesA.href = "#";
        topSitesA.setAttribute("class", "dropdown-item");
        topSitesA.innerText = "Top Sites";
        topSitesA.addEventListener("click", () => {
          this.hideNavbar();
          this.onBtnTopSitesClicked();
        });
        history.appendChild(topSitesA);
      }
      this.appendDividerTo(history);
      const howToUseA = document.createElement("a");
      howToUseA.href = "#";
      howToUseA.setAttribute("class", "dropdown-item");
      howToUseA.innerHTML = "How to Use";
      howToUseA.addEventListener("click", () => {
        this.hideNavbar();
        this.onBtnHowToUseClicked();
      });
      history.appendChild(howToUseA);

      this.showStatusMessage("Loaded diagrams.");

      if (callback) {
        callback();
      }
    });
  }

  load(work) {
    this.loading = true;
    let cursorPosition = this.editor.getCursorPosition();
    this.currentWork = work;
    this.editor.setValue(this.currentWork.content);
    this.editor.clearSelection();
    this.drawDiagram();
    this.editor.focus();
    this.editor.gotoLine(cursorPosition.row + 1, cursorPosition.column, false);
    this.loading = false;
  }

  jumpCaretTo(position) {
    let source = this.editor.getValue();
    let lines = source.split(/\n/);
    let charCount = 0;
    let row = 0;
    for (let i = 0; i < lines.length; i += 1) {
      let eol = lines[i].length + 1;  // '\n'
      if (position < charCount + eol) {
        row = i + 1;
        break;
      }
      charCount += eol;
    }
    this.editor.gotoLine(row, position - charCount, false);
    this.editor.focus();
  }

  // Status bar

  showStatusMessage(message) {
    const statusBar = document.querySelector("#statusMessage");
    statusBar.innerHTML = message;
  }

  // Utilities

  toLocaleString(date) {
    return [
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate()
    ].join("/") + " " + date.toLocaleTimeString();
  }

  hideNavbar() {
    $(".navbar-collapse").collapse("hide");
  }

  isFilterStrikeThroughText() {
    return JSON.parse(localStorage.filterStrikeThrough || "false");
  }

  setConfigrationToUI() {

  }

}

window.addEventListener("load", () => {
  new Newtab();
});
