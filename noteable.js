function noteable (editor) {
if (not(editor) && not(editor instanceof HTMLElement)) {
alert("noteable: argument must be an html container element (preferrably div)");
return null;
} // if

const markers = [
["{{", "}}"],
["[[", "]]"],
["[note]", "[end note]"],
["", ""]
];

initializeEditor(editor, markers);

statusMessage("Ready.");

return editor;
} // noteable

function createEditorControls (editor) {
let controls = editor.querySelector(".controls");
if (controls) return controls;

controls = document.createElement("div");
controls.className = "controls";
controls.innerHTML = `<hr><div class="controls">
<label>highlight: <select class="highlighter" accesskey="h">
<option value="strong">strong</option>
<option value="em">emphasis</option>
<option value="span">none</option>
</select>
</label>

<label>markers for screen reader users: <select class="marker-list" accesskey="m"></select>
</label>

<br><label>enable editing: <input type="checkbox" class="enable-editing"></label>
</div><hr>
`; // html

return controls;
} // createEditorControls

function createAnnotation (s, highlighter, markers) {
if (not(s)) return;

if (s.anchorNode !== s.focusNode) {
s.extend(s.anchorNode, s.anchorNode.textContent.length-1);
} // if

if (s.anchorNode.nodeType !== 3) return; // only operate on text nodes

if (s.toString().length === 0) return;

const note = createNoteFromSelection(s); // text node containing the text we selected
s.removeAllRanges();
const newNote = createNote(note.textContent, highlighter, markers); // node containing start and end markers, along with a span containing the text we selected
note.parentElement.replaceChild(newNote, note); // integrate into the DOM
return newNote;
} // createAnnotation

function deleteAnnotation (note) {
const parent = note.parentElement;
const textNode = document.createTextNode(note.querySelector(".text").textContent);
parent.replaceChild(textNode, note);
parent.normalize();
saveEditorContents(idbKeyval, editor);
} // deleteAnnotation

function createNoteFromSelection (s) {
const node = s.anchorNode;
const start = s.anchorOffset;
const end = s.focusOffset;
//log.insertAdjacentHTML("beforeEnd", `<p>initial: ${start}, ${end}, ${node.textContent.length}</p>`);

if (end < node.textContent.length-1) {
node.splitText(end);
//log.insertAdjacentHTML("beforeEnd", `<p>end split: ${start}, ${end}, ${node.textContent.length}</p>`);
} // if

const text = start > 0?
node.splitText(start) : node;
//log.insertAdjacentHTML("beforeEnd", `<p>after text defined: ${start}, ${end}, ${node.textContent.length}</p>`);

//log.insertAdjacentHTML("beforeEnd", `<p>text: ${text.textContent}</p><hr>`);

return text; // possibly new text node containing only the selected text
} // createNoteFromSelection

function createNote (text, highlighter, markers) {
const note = document.createElement(highlighter);
note.className = "note";
note.insertAdjacentHTML("beforeEnd",
`<span class="start-marker">${markers[0]}</span>
<span class="text" tabindex="0">${text}</span>
<span class="end-marker">${markers[1]}</span>`);

return note;
} // createNote

function initializeMarkerList (list, markers) {
for (let i=0; i<markers.length; i++) {
const display = markers[i][0]? markers[i].toString() : "none";
const option = document.createElement("option");
option.textContent = display;
list.add(option);
} // for

return list;
} // initializeMarkerList

function initializeEditor (editor, markers) {
editor.dataset.initialContents = editor.innerHTML;
editor.innerHTML = `<div class="contents">
${editor.innerHTML}
</div>
`;

const editorControls = createEditorControls(editor);
editor.insertAdjacentElement("afterBegin", editorControls);

const highlighter = editorControls.querySelector(".highlighter");
const markerList = initializeMarkerList(editorControls.querySelector(".marker-list"), markers);
const enabler = editorControls.querySelector(".enable-editing")


enabler.addEventListener("change", e => {
if (e.target.checked) enableEditor(editor);
else disableEditor(editor);
});

restoreEditorContents(idbKeyval, editor);

editor.addEventListener("keydown", editorKeyboardHandler);

highlighter.addEventListener("change", e => changeAllHighlighters(editor, e.target.value));
markerList.addEventListener("change", e => changeAllMarkers(editor, markers[e.target.selectedIndex]));

if (enabler.checked) enableEditor(editor);
else disableEditor(editor);

return editor;

function editorKeyboardHandler (e) {
switch (e.key) {
// allow these keys to have their default behavior
case "ArrowLeft": case "ArrowRight":
case "ArrowUp": case "ArrowDown":
case "Home": case "End":
case "Tab": case "F6":
return true; break;

case "Delete": {
const isNote = e.target && e.target.classList.contains("text");
if (isNote) deleteAnnotation(e.target.parentElement);
} break;

case "Enter": {
const isNote = e.target && e.target.classList.contains("text");
if (isNote && e.altKey) getProperties(e.target.parentElement);
else {
const note = createAnnotation(document.getSelection(), highlighter.value, markers[markerList.selectedIndex]);
if (note) {
note.querySelector(".text").focus();
saveEditorContents(idbKeyval, editor);
} // if
} // if
} break;

case "Escape": if(editor.hasAttribute("contenteditable")) {
disableEditor(editor);
enabler.checked = false;
enabler.focus();
} // if
break;
} // switch

e.preventDefault();
} // editorKeyboardHandler
} // initializeEditor

function enableEditor (editor) {
const contents = editor.querySelector(".contents");
contents.setAttribute("contenteditable", "true");
contents.setAttribute("role", "textarea");
contents.querySelectorAll(".note .text")
.forEach(text => text.tabIndex = 0);
contents.focus();
} // enableEditor

function disableEditor (editor) {
const contents = editor.querySelector(".contents");
contents.removeAttribute("contenteditable");
contents.querySelectorAll(".note .text")
.forEach(text => text.removeAttribute("tabindex"));
} // disableEditor

function getProperties (note) {

let dialog = document.querySelector("dialog.noteable-properties");
if (not(dialog)) {
dialog = document.createElement("dialog");
dialog.className = "noteable-properties";
dialog.addEventListener("close", e => {
if (dialog.returnValue === "ok") addProperties(note, dialog);
}); // submit
document.body.appendChild(dialog);
} // if

dialog.innerHTML = createDialogContents({
fields: [
["text", "annotation", note.dataset.text || ""],
["user", "user", note.dataset.user || ""]
]
}); // createDialog

dialog.showModal();
} // getProperties

function addProperties (note, dialog) {
const form = dialog.querySelector("form");
note.dataset.user = form.user.value;
note.dataset.text = form.text.value;
saveEditorContents(idbKeyval, editor);
} // addProperties

function saveInitialContents (editor) {
editor.dataset.initialContent = editor.innerHTML;
} // saveInitialContents

function saveEditorContents (db, editor) {
save(db, "noteable_editorContents", editor.querySelector(".contents").innerHTML);
} // saveEditorContents

async function restoreEditorContents (db, editor) {
const html = await restore(db, "noteable_editorContents");
if (html) {
editor.querySelector(".contents").innerHTML = html;
statusMessage("Restore complete.");
} // if
} // restoreEditorContents


function changeAllHighlighters (editor, tagName) {
editor.querySelectorAll(".note").forEach(note => {
const newNote = document.createElement(tagName);
newNote.innerHTML = note.innerHTML;
newNote.className = note.className;
note.replaceWith(newNote);
}); // forEach note
} // changeAllHighlighters

function changeAllMarkers (editor, markers) {
editor.querySelectorAll(".note").forEach(note => {
note.querySelector(".start-marker").textContent = markers[0];
note.querySelector(".end-marker").textContent = markers[1];
}); // forEach note
} // changeAllMarkers

function not(x) {return !x;}

function createDialogContents (options) {
if (not(options)) return "";

return `<header>
<h2>Properties</h2>
</header>

<form method="dialog">
${options.fields.map(fd => {
const name = fd[0];
const label = fd[1] || name;
const initialValue = fd[2] || "";

return `<div class="form-field" id="${name}">
<label>${label}: <input type="text" name="${name}" value="${initialValue.toString()}">
</label></div>\n
`;
}).join("")}
<div >
<button type="submit" value="ok">OK</button>
<button type="submit" value="cancel">Cancel</button>
</div>
</form>
`; // html

} // createDialog

function statusMessage (text) {
document.querySelector("output").textContent = text;
} // statusMessage

/// database stuff

async function save (db, key, value) {
try {
await db.set("noteable_editorContents", value);
statusMessage("Save complete.");
} catch (e) {
statusMessage(`Database error: ${e}`);
} // try
} // save

async function restore (db, key, value) {
return ""; // debugging;
try {
const value = db.get(key);
return value || "";
} catch (e) {
statusMessage(`database error: ${e}`);
return "";
} // try
} // restore
