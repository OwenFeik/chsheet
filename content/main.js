const locale = "en-AU";

"use strict";

window.onload = function() {
    var sheet = document.getElementById("sheet");
    set_up_db();
    set_up_sheet();
    set_up_toolbox();
    set_up_shortcuts();
};
