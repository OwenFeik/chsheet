
"use strict";

window.onload = function() {
    let session = new Session();

    let sheet = new Sheet();
    document.getElementById("container").appendChild(sheet.element);

    set_up_db(() => {
        session.check_cookies();
        let active_sheet = localStorage.getItem("active_sheet");
        if (active_sheet) {
            get_sheet_from_db(active_sheet, save => {
                if (save) {
                    sheet.replace(Sheet.from_json(save));
                }
                else {
                    localStorage.removeItem("active_sheet");
                }
            });
        }
    });
    set_up_workspace(session, sheet);
};
