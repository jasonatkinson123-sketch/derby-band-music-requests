# Derby Band Music Request Station

A student-facing 8-bit replacement-music request site for 6th, 7th, and 8th grade band.

## Student flow

1. Choose grade.
2. Enter name.
3. Choose a piece available to that grade.
4. Choose instrument.
5. Submit the request.
6. Confirmation tells the student the copy will be ready at the next rehearsal.

The same GitHub Pages URL can be posted in Google Classroom and turned into a QR code for the band room.

## Teacher mode

Use the small **TEACHER** button at the bottom of the page. With the admin PIN you can see the current replacement-music queue, mark requests printed, copy the whole open queue, add pieces, and remove pieces from student view.

## Repertoire preloaded

Dragon Slayer, Jester Dance, Alpha Squadron, Midnight Madness, The Might of Hercules, Rise of the Bladesmith, Star Wars, The Tenth Planet, Shine, Falcon's Flight March, Mechanical Monsters, Wrath of the Mechanical Monsters, The Tempest, Power, Valiance, Engines of Resistance, To Conquer the Kraken, and Snakebite!

## One-time backend setup

1. Create a standalone Google Apps Script project.
2. Replace its code with `apps-script/Code.gs`.
3. In Apps Script **Project Settings → Script Properties**, add `ADMIN_KEY` with any PIN/password you want for Teacher Mode.
4. Deploy as a **Web app**, executing as **Me**, with access set to **Anyone**.
5. Copy the Web App URL ending in `/exec`.
6. Paste it into `config.js` as the `API_URL`.
7. Enable GitHub Pages from the repository root on the `main` branch.

The backend automatically creates a Google Sheet named **Derby Band Music Requests** with `Pieces` and `Requests` tabs.
