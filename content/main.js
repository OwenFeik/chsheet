
"use strict";

window.onload = function() {
    let session = new Session();

    let sheet = new Sheet();
    document.getElementById("container").appendChild(sheet.element);    

    // ?sheet=sheet_code specifies a sheet to load from the server.
    let code = new URL(window.location).searchParams.get("sheet");

    set_up_db(() => {
        session.check_cookies();
        
        // If code is specified, we won't try and load the active sheet.
        if (code) {
            return;
        }

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

    if (code) {
        session.load_sheet(code, res => {
            if (res.success) {
                sheet.replace(
                    Sheet.from_json(Object.assign(res, { code: null }))
                );
            }
        });
    }
};
