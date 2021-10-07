
"use strict";

window.onload = function() {
    let session = new Session();

    let sheet = new Sheet();
    document.getElementById("container").appendChild(sheet.element);

    set_up_db(() => session.check_cookies());
    set_up_workspace(session, sheet);
};
