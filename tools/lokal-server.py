"""
Lille testserver, der opfoerer sig som Apache paa Simply.com med den
.htaccess, der ligger i projektet: pæne adresser uden .html, index.html i
mapper, og .tar.gz leveret raa uden Content-Encoding.

Bruges kun til at afproeve siden lokalt - den bliver ikke lagt op paa
serveren (se exclude-listen i .github/workflows/deploy.yml).
"""
import os
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlsplit

ROOT = sys.argv[1]
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 8790

GAME = "/spil/regnehelten/"


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def _fs(self, path):
        return os.path.join(ROOT, path.lstrip("/").replace("/", os.sep))

    def send_head(self):
        path = urlsplit(self.path).path

        # .html skrives af adressen (undtagen i spilmappen)
        if path.endswith(".html") and not path.startswith(GAME):
            target = path[:-5]
            if target.endswith("/index"):
                target = target[:-5]
            return self._redirect(target)

        # mappe uden skraastreg
        if not path.endswith("/") and os.path.isdir(self._fs(path)):
            return self._redirect(path + "/")

        # mappe -> index.html
        if path.endswith("/"):
            if os.path.isfile(self._fs(path + "index.html")):
                self.path = path + "index.html"
            else:
                return self._notfound()

        # /regnehelten -> regnehelten.html
        elif not os.path.isfile(self._fs(path)):
            if os.path.isfile(self._fs(path + ".html")):
                self.path = path + ".html"
            else:
                return self._notfound()

        return super().send_head()

    def _redirect(self, to):
        self.send_response(301)
        self.send_header("Location", to)
        self.send_header("Content-Length", "0")
        self.end_headers()
        return None

    def _notfound(self):
        body = open(os.path.join(ROOT, "404.html"), "rb").read()
        self.send_response(404)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
        return None

    def guess_type(self, path):
        # Det afgoerende: .tar.gz skal vaere en filtype, ikke en kodning.
        # Ellers pakker browseren den ud, og spillet kan ikke laese den.
        if path.endswith(".tar.gz") or path.endswith(".gz"):
            return "application/gzip"
        if path.endswith(".apk"):
            return "application/octet-stream"
        if path.endswith(".wasm"):
            return "application/wasm"
        return super().guess_type(path)

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("%s %s\n" % (self.address_string(), fmt % args))


HTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
