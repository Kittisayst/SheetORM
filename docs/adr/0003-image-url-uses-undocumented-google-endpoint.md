# getImageUrl() uses the undocumented lh3.googleusercontent.com endpoint

`DriveFolder.getImageUrl(fileId)` returns `https://lh3.googleusercontent.com/d/<fileId>` rather than any of
Google's documented Drive URL patterns (`drive.google.com/file/d/<id>/view`,
`drive.google.com/uc?export=view&id=<id>`, `drive.google.com/thumbnail?id=<id>`). Real-world testing during
a room-photo upload feature found the documented patterns unreliable as `<img src>` values in actual
browsers: the viewer-page link isn't an image response at all, and the `uc?export=view` / `thumbnail`
endpoints get blocked by Chrome's Opaque Response Blocking or rate-limited depending on the request/redirect
chain — problems invisible to `curl`, only visible testing in a real browser.

`lh3.googleusercontent.com/d/<id>` is not part of Google's public Drive API surface — it's an
undocumented image-CDN URL that happens to render reliably today. This is a deliberate trade-off: every
consumer of `getImageUrl()` inherits the risk that Google changes or blocks this endpoint without notice,
in exchange for something that actually works in a browser today, unlike the documented alternatives tried
first. If this endpoint breaks, `getImageUrl()`'s implementation is the single place to fix it library-wide.
