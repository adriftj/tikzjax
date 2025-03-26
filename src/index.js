import { TikZJax } from "./TikZJax";

window.TikZJax = TikZJax;
if (!window.TikZJaxNoAutostart) {
    document.addEventListener("DOMContentLoaded", function () {
        TikZJax(document);
    });
}
