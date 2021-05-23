const locale = "en-AU";

"use strict";

var sheet;

window.onload = function() {
    sheet = new Sheet();
    document.getElementById("container").appendChild(sheet.element);

    // set_up_db();
    set_up_toolbox();
    set_up_shortcuts();
};
