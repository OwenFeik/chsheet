
"use strict";

window.onload = function() {
    let sheet = new Sheet();
    document.getElementById("container").appendChild(sheet.element);

    set_up_db();
    set_up_workspace(sheet);
};
