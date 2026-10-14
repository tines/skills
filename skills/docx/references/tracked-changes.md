# Tracked changes

A tracked change is a run wrapped in `w:ins` (insertion) or a run wrapped in `w:del` whose text sits in `w:delText` (deletion). Each wrapper needs a unique `w:id`, an author, and a date. Word then shows the edit as a redline the user can accept or reject.

```python
from datetime import datetime, timezone
from copy import deepcopy
from itertools import count

from docx.oxml import OxmlElement
from docx.oxml.ns import qn

revision_ids = count(1000)
DATE = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

def revision(tag, author):
    element = OxmlElement(tag)
    element.set(qn("w:id"), str(next(revision_ids)))
    element.set(qn("w:author"), author)
    element.set(qn("w:date"), DATE)
    return element

def track_replace(run, old, new, author="3B"):
    """Redline `old` -> `new` inside one run, keeping the run's formatting."""
    if old not in run.text:
        return False
    before, _, after = run.text.partition(old)
    source = run._r
    parent = source.getparent()
    position = parent.index(source)

    def copy_run(text, text_tag="w:t"):
        clone = deepcopy(source)
        for child in list(clone):
            if child.tag != qn("w:rPr"):
                clone.remove(child)
        node = OxmlElement(text_tag)
        node.text = text
        node.set(qn("xml:space"), "preserve")
        clone.append(node)
        return clone

    pieces = []
    if before:
        pieces.append(copy_run(before))
    deletion = revision("w:del", author)
    deletion.append(copy_run(old, "w:delText"))
    pieces.append(deletion)
    if new:
        insertion = revision("w:ins", author)
        insertion.append(copy_run(new))
        pieces.append(insertion)
    if after:
        pieces.append(copy_run(after))

    parent.remove(source)
    for offset, piece in enumerate(pieces):
        parent.insert(position + offset, piece)
```

`track_replace` redlines one run. When the old text spans several runs, don’t merge them, because that drops their formatting. Call it on the run where the match starts, with that run’s part of the old text and the full new text, then on each following run with its part of the old text and `""`, which records only a deletion.

Choose IDs above any already in the document. Check by searching `word/document.xml` for `w:id=`. Use the author name the user asks for, and tell them the edits appear in Word’s Review pane. The 3B preview shows the document but may not mark the redlines.

To read existing redlines, look for `w:ins` and `w:del` in the XML: python-docx’s `paragraph.text` omits text inside `w:ins` and never includes `w:delText`.
