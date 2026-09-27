use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, WindowEvent,
};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            let open = MenuItem::with_id(app, "open", "Open Garden", true, None::<&str>)?;
            let sync = MenuItem::with_id(app, "sync", "Sync now", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &sync, &quit])?;
            // A visible 4x4 leaf mark is centered in a transparent 16px tray image.
            let mut pixels = vec![0; 16 * 16 * 4];
            for (x, y, color) in [
                (7, 3, [118, 174, 89, 255]), (8, 3, [118, 174, 89, 255]),
                (6, 4, [118, 174, 89, 255]), (7, 4, [159, 207, 119, 255]),
                (8, 4, [159, 207, 119, 255]), (9, 4, [118, 174, 89, 255]),
                (7, 5, [118, 174, 89, 255]), (8, 5, [118, 174, 89, 255]),
                (7, 6, [107, 151, 79, 255]), (8, 6, [107, 151, 79, 255]),
                (7, 7, [107, 151, 79, 255]), (8, 7, [107, 151, 79, 255]),
            ] {
                let index = ((y * 16 + x) * 4) as usize;
                pixels[index..index + 4].copy_from_slice(&color);
            }
            let icon = Image::new_owned(pixels, 16, 16);
            TrayIconBuilder::new()
                .icon(icon)
                .tooltip("GitHub Garden")
                .menu(&menu)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "open" => show_garden(app),
                    "sync" => {
                        let _ = app.emit("garden://sync", ());
                        show_garden(app);
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event {
                        show_garden(tray.app_handle());
                    }
                })
                .build(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("failed to run GitHub Garden desktop application");
}

fn show_garden(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}
