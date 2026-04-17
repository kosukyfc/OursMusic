# -*- coding: utf-8 -*-
"""
Magic Music Importer - Interface Tkinter
Autor: <Ytalo>
"""

import os
import re
import threading
import tkinter as tk
from tkinter import ttk, messagebox
from pathlib import Path

# imports pesados carregados sob demanda (não travam a GUI se ausentes)
try:
    import requests
except ImportError:
    requests = None

try:
    import lyricsgenius as _lyricsgenius
except ImportError:
    _lyricsgenius = None

try:
    from yt_dlp import YoutubeDL
except ImportError:
    YoutubeDL = None

try:
    from youtube_search import YoutubeSearch
except ImportError:
    YoutubeSearch = None

try:
    from mutagen.mp3 import MP3
    from mutagen.id3 import ID3, TIT2, TPE1, TALB, TDRC, TCON, TRCK, COMM, APIC
    _mutagen_ok = True
except ImportError:
    _mutagen_ok = False

# ===========================  CREDENCIAIS  ===========================
GENIUS_TOKEN = "86lRCdFs7Mucbcnug3P4SHkX5XUzXV49wCZlnGONSSKz0ZB8jDtYme9Q1KaVBq2R"
YOUTUBE_KEY  = "AIzaSyDP9bBwuXvkV2Yon-ZV83E5o0CU2FbKstQ"
# ====================================================================

OUTPUT_FOLDER = "músicas"
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# ─────────────────────────── helpers ────────────────────────────────

def sanitize(name: str) -> str:
    return re.sub(r'[<>:"/\\|?*]', '_', name).strip()

def ydl_opts(fname: str) -> dict:
    return {
        'format': 'bestaudio/best',
        'outtmpl': fname,
        'quiet': True,
        'no_warnings': True,
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }]
    }

def yt_url_by_isrc(isrc: str, artist: str, track: str) -> str:
    if isrc and isrc.strip():
        try:
            resp = requests.get(
                "https://www.googleapis.com/youtube/v3/search",
                params={'part': 'snippet', 'type': 'video', 'q': isrc,
                        'key': YOUTUBE_KEY, 'maxResults': 3},
                timeout=5
            ).json()
            for v in resp.get('items', []):
                if artist.lower() in v['snippet']['title'].lower():
                    return f"https://youtu.be/{v['id']['videoId']}"
        except:
            pass
    q = f"{artist} - {track} official audio".replace(" ", "+")
    res = YoutubeSearch(q, max_results=1).to_dict()
    return f"https://youtu.be/{res[0]['id']}" if res else ""

def deezer_search_album(artist: str, album: str):
    r = requests.get("https://api.deezer.com/search/album",
                     params={"q": f'artist:"{artist}" album:"{album}"', "limit": 1})
    r.raise_for_status()
    data = r.json()
    if not data.get("data"):
        return None
    album_id = data["data"][0]["id"]
    alb = requests.get(f"https://api.deezer.com/album/{album_id}").json()
    if "error" in alb:
        return None
    tracks = []
    for i, t in enumerate(alb["tracks"]["data"], start=1):
        track_number = t.get("track_position") or t.get("position") or i
        tracks.append({
            "id": str(t.get("id", "")),
            "title": t.get("title", ""),
            "duration_ms": int(t.get("duration", 0)) * 1000,
            "track_number": int(track_number),
            "disc_number": t.get("disk_number", 1),
            "isrc": t.get("isrc", ""),
            "artist": t.get("artist", {}).get("name", artist),
            "explicit": t.get("explicit_lyrics", False),
        })
    return {
        "album_id": str(album_id),
        "name": alb.get("title", album),
        "release_date": alb.get("release_date", ""),
        "cover_url": alb.get("cover_xl", ""),
        "genres": ", ".join(g["name"] for g in alb.get("genres", {}).get("data", [])),
        "label": alb.get("label", ""),
        "tracks": tracks,
    }

def deezer_search_track(query: str):
    """Busca uma única faixa no Deezer. Retorna lista de tracks."""
    r = requests.get("https://api.deezer.com/search",
                     params={"q": query, "limit": 1})
    r.raise_for_status()
    data = r.json()
    if not data.get("data"):
        return None
    t = data["data"][0]
    alb = t.get("album", {})
    return [{
        "id": str(t.get("id", "")),
        "title": t.get("title", ""),
        "duration_ms": int(t.get("duration", 0)) * 1000,
        "track_number": 1,
        "disc_number": 1,
        "isrc": t.get("isrc", ""),
        "artist": t.get("artist", {}).get("name", ""),
        "explicit": t.get("explicit_lyrics", False),
        "_album_name": alb.get("title", ""),
        "_cover_url": alb.get("cover_xl", ""),
        "_release_date": "",
    }]

def deezer_search_playlist(playlist_url_or_id: str):
    """Aceita URL completa ou só o ID de playlist do Deezer."""
    pid = playlist_url_or_id.strip()
    # extrai ID de URL como https://www.deezer.com/playlist/12345
    m = re.search(r'playlist[/:](\d+)', pid)
    if m:
        pid = m.group(1)
    elif not pid.isdigit():
        raise ValueError(f"ID de playlist inválido: {playlist_url_or_id}")

    pl = requests.get(f"https://api.deezer.com/playlist/{pid}").json()
    if "error" in pl:
        raise ValueError(pl["error"].get("message", "Playlist não encontrada"))

    tracks = []
    for i, t in enumerate(pl.get("tracks", {}).get("data", []), start=1):
        alb = t.get("album", {})
        tracks.append({
            "id": str(t.get("id", "")),
            "title": t.get("title", ""),
            "duration_ms": int(t.get("duration", 0)) * 1000,
            "track_number": i,
            "disc_number": 1,
            "isrc": t.get("isrc", ""),
            "artist": t.get("artist", {}).get("name", ""),
            "explicit": t.get("explicit_lyrics", False),
            "_album_name": alb.get("title", ""),
            "_cover_url": alb.get("cover_xl", ""),
            "_release_date": "",
        })
    return {
        "name": pl.get("title", "Playlist"),
        "tracks": tracks,
        "cover_url": pl.get("picture_xl", ""),
    }

def itunes_best_cover(artist: str, album: str) -> str:
    try:
        res = requests.get("https://itunes.apple.com/search",
                           params={"term": f"{artist} {album}", "entity": "album", "limit": 1}).json()
        if res["resultCount"] > 0:
            return res["results"][0]["artworkUrl100"].replace("100x100", "3000x3000")
    except:
        pass
    return None

def mb_year_and_label(artist: str, album: str):
    try:
        url = "https://musicbrainz.org/ws/2/release"
        params = {"query": f'artist:"{artist}" AND release:"{album}"', "fmt": "json", "limit": 1}
        rels = requests.get(url, params=params,
                            headers={"User-Agent": "MetaGetter/1.0 (contato@seuemail.com)"}).json()
        if rels["releases"]:
            r = rels["releases"][0]
            y = r.get("date")
            lbls = ", ".join(l["name"] for l in r.get("label-info", []) if l.get("label"))
            return y[:4] if y else "", lbls
    except:
        pass
    return "", ""

def tag_file(path: Path, data: dict, cover_bytes: bytes = None):
    audio = MP3(path, ID3=ID3)
    try:
        audio.add_tags()
    except:
        pass
    audio.tags.add(TIT2(encoding=3, text=data['track_title']))
    audio.tags.add(TPE1(encoding=3, text=data['artist_name']))
    audio.tags.add(TALB(encoding=3, text=data['album_name']))
    audio.tags.add(TDRC(encoding=3, text=data['album_year']))
    audio.tags.add(TCON(encoding=3, text=data.get('genres', '')))
    audio.tags.add(TRCK(encoding=3, text=str(data['track_number'])))
    if data.get('lyrics'):
        audio.tags.add(COMM(encoding=3, lang='por', desc='', text=data['lyrics'][:500]))
    if cover_bytes:
        audio.tags.add(APIC(encoding=3, mime='image/jpeg', type=3, desc='Front Cover', data=cover_bytes))
    audio.save()


# ─────────────────────────── lógica de importação ───────────────────

def run_import(params: dict, progress_cb, status_cb, log_cb, done_cb):
    """
    Executa o download em thread separada.
    params keys: mode, artist, album, track_query, playlist_id, max_tracks
    callbacks recebem valores seguros para chamar via .after()
    """
    mode       = params["mode"]
    artist     = params.get("artist", "")
    album      = params.get("album", "")
    track_q    = params.get("track_query", "")
    playlist   = params.get("playlist_id", "")
    max_tracks = params.get("max_tracks", 100)

    if not requests:
        done_cb(0, "❌ Biblioteca 'requests' não instalada.\nRode: pip install requests")
        return
    if not YoutubeDL:
        done_cb(0, "❌ Biblioteca 'yt-dlp' não instalada.\nRode: pip install yt-dlp")
        return

    genius = None
    if GENIUS_TOKEN and _lyricsgenius:
        try:
            genius = _lyricsgenius.Genius(
                GENIUS_TOKEN,
                remove_section_headers=True,
                skip_non_songs=True,
                verbose=False,
            )
        except:
            pass

    try:
        # ── resolver faixas conforme modo ──
        if mode == "album_artist":
            log_cb(f"🔍 Buscando álbum '{album}' de {artist}...")
            album_data = deezer_search_album(artist, album)
            if not album_data:
                done_cb(0, "❌ Álbum não encontrado no Deezer.")
                return
            album_data["cover_url"] = itunes_best_cover(artist, album) or album_data["cover_url"]
            year_mb, label_mb = mb_year_and_label(artist, album)
            album_data["release_year"] = year_mb or album_data["release_date"][:4]
            album_data["label"]        = label_mb or album_data.get("label", "")
            tracks     = album_data["tracks"][:max_tracks]
            cover_url  = album_data["cover_url"]
            album_name = album_data["name"]
            release_year = album_data["release_year"]
            genres     = album_data.get("genres", "")
            label      = album_data.get("label", "")

        elif mode == "track":
            log_cb(f"🔍 Buscando faixa '{track_q}'...")
            result = deezer_search_track(track_q)
            if not result:
                done_cb(0, "❌ Faixa não encontrada no Deezer.")
                return
            t0 = result[0]
            artist     = artist or t0["artist"]
            album_name = t0.get("_album_name", "Single")
            cover_url  = itunes_best_cover(artist, album_name) or t0.get("_cover_url", "")
            year_mb, label_mb = mb_year_and_label(artist, album_name)
            release_year = year_mb or t0.get("_release_date", "")[:4]
            genres     = ""
            label      = label_mb
            tracks     = result[:max_tracks]

        elif mode == "album_only":
            log_cb(f"🔍 Buscando álbum '{album}'...")
            album_data = deezer_search_album(artist or "", album)
            if not album_data:
                done_cb(0, "❌ Álbum não encontrado no Deezer.")
                return
            artist     = artist or album_data["tracks"][0]["artist"] if album_data["tracks"] else artist
            album_data["cover_url"] = itunes_best_cover(artist, album) or album_data["cover_url"]
            year_mb, label_mb = mb_year_and_label(artist, album)
            album_data["release_year"] = year_mb or album_data["release_date"][:4]
            album_data["label"]        = label_mb or album_data.get("label", "")
            tracks     = album_data["tracks"][:max_tracks]
            cover_url  = album_data["cover_url"]
            album_name = album_data["name"]
            release_year = album_data["release_year"]
            genres     = album_data.get("genres", "")
            label      = album_data.get("label", "")

        elif mode == "playlist":
            log_cb(f"🔍 Buscando playlist '{playlist}'...")
            pl_data = deezer_search_playlist(playlist)
            tracks     = pl_data["tracks"][:max_tracks]
            cover_url  = pl_data.get("cover_url", "")
            album_name = pl_data["name"]
            release_year = ""
            genres     = ""
            label      = ""

        else:
            done_cb(0, "❌ Modo inválido.")
            return

        total = len(tracks)
        log_cb(f"✅ {total} faixas encontradas. Iniciando downloads...\n")

        # capa única
        cover_bytes = None
        if cover_url:
            try:
                cover_bytes = requests.get(cover_url, timeout=10).content
            except:
                pass

        downloaded = 0
        for idx, t in enumerate(tracks, start=1):
            t_artist = t.get("artist") or artist
            t_album  = t.get("_album_name") or album_name

            status_cb(f"Baixando faixa {idx}/{total}: {t['title']}")
            progress_cb(idx, total)
            log_cb(f"  [{idx}/{total}] {t_artist} – {t['title']}")

            row = {
                "artist_name":  t_artist,
                "album_name":   t_album,
                "album_year":   release_year,
                "album_label":  label,
                "track_number": t["track_number"],
                "track_title":  t["title"],
                "isrc":         t.get("isrc", ""),
                "disc_number":  t.get("disc_number", 1),
                "cover_url":    cover_url,
                "duration_ms":  t["duration_ms"],
                "genres":       genres,
                "lyrics":       "",
            }

            # letra
            if genius:
                try:
                    song = genius.search_song(t["title"], t_artist)
                    row["lyrics"] = song.lyrics.strip() if song else ""
                except:
                    pass

            # download YouTube
            filename  = sanitize(f"{row['track_number']:02d} - {row['track_title']}")
            audio_path = Path(OUTPUT_FOLDER) / f"{filename}.%(ext)s"
            yt_url = yt_url_by_isrc(row["isrc"], t_artist, row["track_title"])
            if not yt_url:
                yt_url = yt_url_by_isrc('', t_artist, row["track_title"])

            if yt_url:
                try:
                    with YoutubeDL(ydl_opts(str(audio_path))) as ydl:
                        ydl.download([yt_url])
                    down_files = list(Path(OUTPUT_FOLDER).glob(f"{filename}*"))
                    if down_files:
                        final = down_files[0].with_suffix('.mp3')
                        down_files[0].replace(final)
                        tag_file(final, row, cover_bytes)
                        downloaded += 1
                except Exception as e:
                    log_cb(f"  ⚠️ Falha: {t['title']} — {e}")
            else:
                log_cb(f"  ⚠️ URL não encontrada para: {t['title']}")

        done_cb(downloaded, None)

    except Exception as e:
        done_cb(0, f"❌ Erro inesperado: {e}")


# ─────────────────────────── janela de importação ───────────────────

class ImportWindow(tk.Toplevel):
    def __init__(self, master, log_cb):
        super().__init__(master)
        self.log_cb   = log_cb
        self.title("✨ Magic Import")
        self.resizable(False, False)
        self.configure(bg="#1e1e2e")
        self._build_ui()
        self.grab_set()

    def _build_ui(self):
        PAD = {"padx": 16, "pady": 8}

        # título
        tk.Label(self, text="✨ Magic Import", font=("Segoe UI", 16, "bold"),
                 bg="#1e1e2e", fg="#cba6f7").pack(pady=(18, 4))
        tk.Label(self, text="Escolha o modo de busca",
                 font=("Segoe UI", 10), bg="#1e1e2e", fg="#a6adc8").pack(pady=(0, 10))

        # ── modo ──
        self.mode_var = tk.StringVar(value="album_artist")
        modes = [
            ("Artista + Álbum",   "album_artist"),
            ("Música (single)",   "track"),
            ("Álbum",             "album_only"),
            ("Playlist (Deezer)", "playlist"),
        ]
        frame_modes = tk.Frame(self, bg="#1e1e2e")
        frame_modes.pack(fill="x", **PAD)
        for label, val in modes:
            rb = tk.Radiobutton(frame_modes, text=label, variable=self.mode_var,
                                value=val, command=self._refresh_fields,
                                bg="#1e1e2e", fg="#cdd6f4", selectcolor="#313244",
                                activebackground="#1e1e2e", activeforeground="#cba6f7",
                                font=("Segoe UI", 10))
            rb.pack(side="left", padx=6)

        # ── campos dinâmicos ──
        self.fields_frame = tk.Frame(self, bg="#1e1e2e")
        self.fields_frame.pack(fill="x", padx=16, pady=4)

        self.entry_artist   = self._make_field(self.fields_frame, "🎤 Artista")
        self.entry_album    = self._make_field(self.fields_frame, "💿 Álbum")
        self.entry_track    = self._make_field(self.fields_frame, "🎵 Nome da música")
        self.entry_playlist = self._make_field(self.fields_frame, "🎧 URL ou ID da playlist")

        # ── limite ──
        lim_frame = tk.Frame(self, bg="#1e1e2e")
        lim_frame.pack(fill="x", padx=16, pady=4)
        tk.Label(lim_frame, text="🔢 Limite máximo de faixas (máx 100):",
                 bg="#1e1e2e", fg="#cdd6f4", font=("Segoe UI", 10)).pack(side="left")
        self.limit_var = tk.StringVar(value="100")
        tk.Spinbox(lim_frame, from_=1, to=100, textvariable=self.limit_var,
                   width=5, font=("Segoe UI", 10),
                   bg="#313244", fg="#cdd6f4", buttonbackground="#45475a",
                   relief="flat").pack(side="left", padx=8)

        # ── progress ──
        prog_frame = tk.Frame(self, bg="#1e1e2e")
        prog_frame.pack(fill="x", padx=16, pady=(10, 2))
        self.status_label = tk.Label(prog_frame, text="Aguardando...",
                                     bg="#1e1e2e", fg="#a6adc8", font=("Segoe UI", 9))
        self.status_label.pack(anchor="w")
        self.progress = ttk.Progressbar(prog_frame, orient="horizontal",
                                        length=420, mode="determinate")
        self.progress.pack(fill="x", pady=4)

        # ── botão importar ──
        self.btn_import = tk.Button(
            self, text="  Importar  ", font=("Segoe UI", 12, "bold"),
            bg="#7c3aed", fg="white", activebackground="#6d28d9",
            activeforeground="white", relief="flat", cursor="hand2",
            padx=20, pady=8, command=self._start_import
        )
        self.btn_import.pack(pady=(10, 18))

        self._refresh_fields()

    def _make_field(self, parent, label: str):
        frame = tk.Frame(parent, bg="#1e1e2e")
        tk.Label(frame, text=label, bg="#1e1e2e", fg="#cdd6f4",
                 font=("Segoe UI", 10), width=30, anchor="w").pack(side="left")
        entry = tk.Entry(frame, font=("Segoe UI", 10), width=32,
                         bg="#313244", fg="#cdd6f4", insertbackground="#cdd6f4",
                         relief="flat", bd=4)
        entry.pack(side="left", padx=4)
        frame._entry = entry
        return frame

    def _refresh_fields(self):
        mode = self.mode_var.get()
        show = {
            "album_artist": [self.entry_artist, self.entry_album],
            "track":        [self.entry_artist, self.entry_track],
            "album_only":   [self.entry_album],
            "playlist":     [self.entry_playlist],
        }
        all_fields = [self.entry_artist, self.entry_album,
                      self.entry_track, self.entry_playlist]
        for f in all_fields:
            f.pack_forget()
        for f in show.get(mode, []):
            f.pack(fill="x", pady=3)

    def _start_import(self):
        mode = self.mode_var.get()
        try:
            max_t = min(int(self.limit_var.get() or 100), 100)
        except ValueError:
            max_t = 100

        params = {
            "mode":       mode,
            "artist":     self.entry_artist._entry.get().strip(),
            "album":      self.entry_album._entry.get().strip(),
            "track_query": self.entry_track._entry.get().strip(),
            "playlist_id": self.entry_playlist._entry.get().strip(),
            "max_tracks": max_t,
        }

        # validações básicas
        if mode == "album_artist" and (not params["artist"] or not params["album"]):
            messagebox.showwarning("Campos obrigatórios", "Preencha Artista e Álbum.", parent=self)
            return
        if mode == "track" and not params["track_query"]:
            messagebox.showwarning("Campo obrigatório", "Preencha o nome da música.", parent=self)
            return
        if mode == "album_only" and not params["album"]:
            messagebox.showwarning("Campo obrigatório", "Preencha o nome do álbum.", parent=self)
            return
        if mode == "playlist" and not params["playlist_id"]:
            messagebox.showwarning("Campo obrigatório", "Preencha a URL ou ID da playlist.", parent=self)
            return

        self.btn_import.config(state="disabled")
        self.progress["value"] = 0

        def progress_cb(current, total):
            pct = (current / total) * 100 if total else 0
            self.after(0, lambda: self.progress.config(value=pct))

        def status_cb(msg):
            self.after(0, lambda: self.status_label.config(text=msg))

        def log_cb(msg):
            self.log_cb(msg)

        def done_cb(count, error):
            def _finish():
                self.btn_import.config(state="normal")
                self.progress["value"] = 100
                if error:
                    self.status_label.config(text=error)
                    messagebox.showerror("Erro", error, parent=self)
                else:
                    self.status_label.config(text=f"✅ Concluído! {count} músicas salvas.")
                    messagebox.showinfo(
                        "Importação concluída",
                        f"✅ Importação concluída!\n{count} músicas foram salvas na pasta 'músicas'.",
                        parent=self
                    )
            self.after(0, _finish)

        threading.Thread(
            target=run_import,
            args=(params, progress_cb, status_cb, log_cb, done_cb),
            daemon=True
        ).start()


# ─────────────────────────── janela principal ───────────────────────

class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Magic Music Importer")
        self.configure(bg="#1e1e2e")
        self.resizable(True, True)
        self.minsize(560, 480)
        self._build_ui()

    def _build_ui(self):
        # cabeçalho
        header = tk.Frame(self, bg="#181825", pady=18)
        header.pack(fill="x")
        tk.Label(header, text="🎵 Magic Music Importer",
                 font=("Segoe UI", 20, "bold"),
                 bg="#181825", fg="#cba6f7").pack()
        tk.Label(header, text="Baixe músicas com metadados completos",
                 font=("Segoe UI", 10), bg="#181825", fg="#6c7086").pack(pady=(2, 0))

        # botão principal
        btn_frame = tk.Frame(self, bg="#1e1e2e", pady=20)
        btn_frame.pack()
        magic_btn = tk.Button(
            btn_frame,
            text="✨  Magic Import",
            font=("Segoe UI", 15, "bold"),
            bg="#7c3aed", fg="white",
            activebackground="#6d28d9", activeforeground="white",
            relief="flat", cursor="hand2",
            padx=32, pady=14,
            command=self._open_import,
        )
        magic_btn.pack()

        # separador
        tk.Frame(self, bg="#313244", height=1).pack(fill="x", padx=20)

        # log / console
        log_frame = tk.Frame(self, bg="#1e1e2e")
        log_frame.pack(fill="both", expand=True, padx=16, pady=12)
        tk.Label(log_frame, text="📋 Log em tempo real",
                 font=("Segoe UI", 9, "bold"),
                 bg="#1e1e2e", fg="#6c7086").pack(anchor="w")

        text_frame = tk.Frame(log_frame, bg="#11111b", bd=0)
        text_frame.pack(fill="both", expand=True, pady=(4, 0))

        self.log_text = tk.Text(
            text_frame, font=("Consolas", 9),
            bg="#11111b", fg="#a6e3a1",
            insertbackground="#cdd6f4",
            relief="flat", bd=8,
            state="disabled", wrap="word",
        )
        scrollbar = ttk.Scrollbar(text_frame, command=self.log_text.yview)
        self.log_text.configure(yscrollcommand=scrollbar.set)
        scrollbar.pack(side="right", fill="y")
        self.log_text.pack(side="left", fill="both", expand=True)

        # rodapé
        tk.Label(self, text=f"Pasta de saída: {os.path.abspath(OUTPUT_FOLDER)}",
                 font=("Segoe UI", 8), bg="#1e1e2e", fg="#45475a").pack(pady=(0, 8))

    def _open_import(self):
        ImportWindow(self, self._append_log)

    def _append_log(self, msg: str):
        def _write():
            self.log_text.config(state="normal")
            self.log_text.insert("end", msg + "\n")
            self.log_text.see("end")
            self.log_text.config(state="disabled")
        self.after(0, _write)


# ─────────────────────────── entry point ────────────────────────────

if __name__ == "__main__":
    app = App()
    app.mainloop()
