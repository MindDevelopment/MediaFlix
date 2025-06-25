# MediaFlix - Media Management System

Een complete media management systeem vergelijkbaar met Netflix, Spotify en Instagram functies.

## Features

- **Gebruikersbeheer**: Admin, Developer en Viewer rollen
- **Media Upload**: Ondersteuning voor afbeeldingen, video's, GIFs en muziek
- **Folder Management**: Organiseer bestanden in aangepaste mappen
- **Thumbnail Generatie**: Automatische thumbnails voor afbeeldingen en video's
- **Permission System**: Publieke en privé bestanden
- **REST API**: Complete API voor frontend integratie

## Installatie

1. **Clone de repository**
```bash
git clone <repository-url>
cd MediaFlix
```

2. **Installeer dependencies**
```bash
npm install
```

3. **Configureer environment variabelen**
```bash
cp .env.example .env
```
Bewerk `.env` en voeg je MongoDB connection string en andere configuraties toe.

4. **Start MongoDB**
Zorg ervoor dat MongoDB draait op je systeem.

5. **Seed admin gebruiker** (optioneel)
```bash
npm run seed
```

6. **Start de server**
```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Inloggen
- `POST /api/auth/register` - Registreren (admin only)
- `POST /api/auth/logout` - Uitloggen

### Files
- `GET /api/files/all` - Alle bestanden
- `GET /api/files/public` - Publieke bestanden
- `GET /api/files/private` - Privé bestanden
- `GET /api/files/:category` - Bestanden per categorie
- `POST /api/files/upload/:category` - Upload bestanden
- `GET /api/files/download/:id` - Download bestand
- `DELETE /api/files/:id` - Verwijder bestand

### Folders
- `GET /api/files/folders` - Lijst folders
- `POST /api/files/folders` - Maak folder
- `DELETE /api/files/folders/:id` - Verwijder folder
- `PATCH /api/files/move/:fileId` - Verplaats bestand

### Admin
- `GET /api/admin/users` - Lijst gebruikers
- `POST /api/admin/users` - Maak gebruiker
- `DELETE /api/admin/users/:id` - Verwijder gebruiker
- `GET /api/admin/stats` - Systeem statistieken

## Web Interface

- `/` - Homepage
- `/login` - Login pagina
- `/dashboard` - Gebruiker dashboard
- `/files` - Media bibliotheek
- `/admin` - Admin panel

## Gebruikersrollen

- **Viewer**: Kan publieke bestanden bekijken en downloaden
- **Developer**: Kan bestanden uploaden, folders maken, eigen bestanden beheren
- **Admin**: Volledige toegang tot alle functies en gebruikersbeheer

## Ondersteunde Bestandstypen

- **Images**: JPEG, PNG, GIF, WebP
- **Videos**: MP4, AVI, MOV, WMV
- **GIFs**: GIF
- **Music**: MP3, WAV, OGG

## Technologie Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB met Mongoose
- **Security**: Helmet, CORS, Rate Limiting
- **File Processing**: Sharp (images), FFmpeg (videos)
- **Upload**: Multer
- **Sessions**: Express-session met MongoDB store

## Troubleshooting

### FFmpeg Problemen
Als thumbnail generatie voor video's niet werkt, installeer FFmpeg:
- Windows: Download van https://ffmpeg.org/
- Mac: `brew install ffmpeg`
- Ubuntu: `sudo apt install ffmpeg`

### Upload Directory Problemen
Zorg ervoor dat de `uploads/` directory bestaat en schrijfbaar is.

## Development Commands

```bash
# Start development server met auto-reload
npm run dev

# Seed admin gebruiker
npm run seed

# Start production server
npm start
```

## Configuratie

Zie `.env.example` voor alle beschikbare environment variabelen.

## License

MIT License
