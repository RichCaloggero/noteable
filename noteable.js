async function noteable (editor) {
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

await initializeEditor(editor, markers);

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

<br><label>enable editing: <input type="checkbox" class="enable-editing" accesskey="e"></label>
<label>enable local persistance: <input type="checkbox" class="enable-local-persistance" accesskey="l"></label>
<!--<label>enable remote persistance: <input type="checkbox" class="enable-remote-persistance" accesskey="s"></label>-->
<button class="remove-annotations" accesskey="r">Remove annotations</button>
</div><hr>
`; // html

return controls;
} // createEditorControls

async function initializeEditor (editor, markers) {
editor.classList.add("editor");
editor.dataset.initialContents = editor.innerHTML;


if (not(await restoreEditor(idbKeyval, editor))) {
editor.innerHTML = `<div class="contents">
${editor.innerHTML}
</div>
`;

const editorControls = createEditorControls(editor);
editor.insertAdjacentElement("afterBegin", editorControls);
saveEditor(idbKeyval, editor);
} // if

const editorControls = editor.querySelector(".controls");
const highlighter = editorControls.querySelector(".highlighter");
const markerList = initializeMarkerList(editorControls.querySelector(".marker-list"), markers);
const enableEditing = editorControls.querySelector(".enable-editing")
const editorContents = editor.querySelector(".contents");
const enableLocalPersistance = document.querySelector(".enable-local-persistance");
const removeAnnotations = document.querySelector(".remove-annotations");


enableEditing.addEventListener("change", e => enableEditor(editor, e.target.checked));
enableLocalPersistance.addEventListener("change", e => localPersistance(editor, e.target.checked));

removeAnnotations.addEventListener("click", e => {
removeAllAnnotations(editor);
});

highlighter.addEventListener("change", e => changeAllHighlighters(editor, e.target.value));
markerList.addEventListener("change", e => changeAllMarkers(editor, markers[e.target.selectedIndex]));

editorContents.addEventListener("keydown", editorKeyboardHandler);
editorContents.addEventListener("mouseup", editorClickHandler);

enableEditor(editor, enableEditing.checked);

return editor;

function editorKeyboardHandler (e) {
const navigationKeys = ["arrow", "home", "end", "page", "tab",
"f5", "f6", "alt+d", "control+l", "control+k"
];
const problemKeys = ["arrow", "home", "end", "page"];

e.stopImmediatePropagation();
e.stopPropagation();
const key = new Key(e).toString().toLowerCase();
if (keyMatch(key, navigationKeys)) {
if (e.target.matches(".note .text") && keyMatch(key, problemKeys)) e.preventDefault();
return true;
} // if

e.preventDefault();
if (key === "delete") {
if (isNote(e.target)) {
deleteAnnotation(e.target.parentElement);
editorContents.focus();
} // if

} else if (key === "enter") {
annotate(editor, document.getSelection(), highlighter.value, markers[markerList.selectedIndex]);

} else if (key === "alt+enter") {
if (isNote(e.target)) getProperties(e.target.parentElement);

} else if (key === "escape") {
if (e.target.matches(".note .text")) {
editorContents.focus();
} else if(editorContents.hasAttribute("contenteditable")) {
enableEditor(editor, false);
enableEditing.focus();
} // if
} // if
} // editorKeyboardHandler

function editorClickHandler (e) {
//console.log(e);
if (not(e.target.matches(".editor .contents *"))) return true;
e.preventDefault();
e.stopImmediatePropagation();
e.stopPropagation();

if (isNote(e.target) && e.altKey) {
getProperties(e.target.parentElement);
}else if (not(isNote(e.target))) {
annotate(editor, document.getSelection(), highlighter.value, markers[markerList.selectedIndex]);
} // if
} // editorClickHandler

} // initializeEditor

function annotate (editor, selection, highlight, marker) {
const note = createAnnotation(selection, highlight, marker);
if (note) {
editorChanged(editor);
note.querySelector(".text").focus();
} // if
} // annotate


function enableEditor (editor, state) {
const contents = editor.querySelector(".contents");

if (state) {
contents.setAttribute("contenteditable", "true");
contents.setAttribute("role", "application");
makeAnnotationsFocusable(editor);
contents.dataset.enableEditing = "true";
contents.focus();

} else {
contents.removeAttribute("contenteditable");
contents.removeAttribute("role");
makeAnnotationsUnfocusable(editor);
delete contents.dataset.enableEditing;
} // if


editorChanged(editor);
} // disableEditor

function localPersistance (editor, state) {
console.log("localPersistance: ", editor, state);
const contents = editor.querySelector(".contents");

if (state) {
contents.dataset.localPersistance = "true";

} else {
delete contents.dataset.localPersistance;
} // if


editorChanged(editor);
} // enablePersistance

function makeAnnotationsFocusable (editor) {
editor.querySelectorAll(".contents .note .text")
.forEach(text => text.tabIndex = 0);
} // makeAnnotationsFocusable

function makeAnnotationsUnfocusable (editor) {
editor.querySelectorAll(".contents .note .text")
.forEach(text => text.tabIndex = -1);
} // makeAnnotationsUnfocusable

function createAnnotation (s, highlighter, markers) {
if (not(s)) return;
let {anchorNode, anchorOffset, focusNode, focusOffset} = s;
if (isBefore(focusNode, anchorNode)) {
[anchorNode, focusNode] = [focusNode, anchorNode]; // reverse them
} // if

if (anchorNode !== focusNode) {
s.extend(s.anchorNode, s.anchorNode.textContent.length-1);
({anchorNode, focusNode} = s);
} // if

if (anchorNode.nodeType !== 3) return; // only operate on text nodes

if (s.toString().length === 0) return;

const note = createNoteFromSelection({anchorNode, focusNode, anchorOffset, focusOffset}); // text node containing the text we selected
s.removeAllRanges();
const newNote = createNote(note.textContent, highlighter, markers); // node containing start and end markers, along with a span containing the text we selected
note.parentElement.replaceChild(newNote, note); // integrate into the DOM
return newNote;
} // createAnnotation

function removeAllAnnotations (editor) {
editor.querySelectorAll(".contents .note").forEach(note => deleteAnnotation(note));
} // removeAllAnnotations

function deleteAnnotation (note) {
const editor = note.closest(".editor");
const parent = note.parentElement;
const textNode = document.createTextNode(note.querySelector(".text").textContent);
parent.replaceChild(textNode, note);
parent.normalize();
editorChanged(editor);
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
editorChanged(editor);
} // addProperties

function isNote (element) {
//return element && element.classList.contains("text") && element.parentElement.classList.contains("note");
return element.matches(".note .text");
} // isNote

function saveInitialContents (editor) {
editor.dataset.initialContent = editor.innerHTML;
} // saveInitialContents

function saveEditor (db, editor) {
const contents = editor.querySelector(".contents");

if (contents.dataset.localPersistance) {
save(db, "noteable_editorContents", editor.innerHTML);
} // if
} // saveEditor

async function restoreEditor (db, editor) {
const html = await restore(db, "noteable_editorContents");
if (html) {
editor.innerHTML = html;
const contents = editor.querySelector(".contents");

enableEditor(editor, contents.dataset.enableEditing);
editorChanged(editor, false);
statusMessage("Restore complete.");
return true;

} else {
return false;
} // if
} // restoreEditor

function saveEditorContents (db, editor) {
const contents = editor.querySelector(".contents");

if (contents.dataset.localPersistance) {
save(db, "noteable_editorContents", contents.innerHTML);
} // if
} // saveEditorContents

async function restoreEditorContents (db, editor) {
const contents = editor.querySelector(".contents");
const html = await restore(db, "noteable_editorContents");
if (html) contents.innerHTML = html;
console.log("restore: ", contents.dataset.enableEditing, contents.dataset.localPersistance);
editorChanged(editor);

statusMessage("Restore complete.");
//} // if
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

function editorChanged (editor, save = true) {
const contents = editor.querySelector(".contents");

if (save) saveEditor (idbKeyval, editor);
syncUI (contents.dataset.enableEditing, editor.querySelector(".controls .enable-editing"));
syncUI (contents.dataset.localPersistance, editor.querySelector(".controls .enable-local-persistance"));

} // editorChanged

function syncUI (state, control) {
control.checked = state;
} // syncUI

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
} catch (e) {
statusMessage(`Database error: ${e}`);
} // try
} // save

async function restore (db, key) {
try {
const value = await db.get(key);
return value || "";
} catch (e) {
statusMessage(`database error: ${e}`);
return "";
} // try
} // restore

function isBefore (a, b) {
const nodes = [...document.body.querySelectorAll("*")];
return (nodes.indexOf(a) < nodes.indexOf(b));
} // isBefore

function keyMatch (keyName, keyList) {
return keyList.find(k => keyName.includes(k));
} // keyMatch

function not (x) {return !x;}
