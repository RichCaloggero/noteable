## Background

This code shows how one can select and operate on text in live documents via the keyboard and mouse without needing to parse the text. It uses `contenteditable` and the selection API.

## How to use

You can annotate these instructions by selecting text either with the keyboard or mouse. You can add your own text to the annotation. You can change the markers (used to help screen readers distinguish the annotation from the surrounding text), and the highlight (standard HTML emphasis `em` or `strong` tags, or no highlighting at all).

1. click "enable editing"
   - focus should move into the editing widget
2. select text via standard keyboard methods or by dragging the mouse over the text
   - press enter or release mouse button to create the annotation
3. press alt+enter to assign extra text to the annotation
4. if you create multiple annotations, you can move among them via the tab and shift+tab keys
5. press the delete key when an annotation has focus to remove it
6. check the "enable local persistance" checkbox to have your annotations persist after the browser closes
7. click "remove all annotations" to remove all of them
8. change the markers or highlight tags via the select lists


