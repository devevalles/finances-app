import http.server, ssl, os, socket

os.chdir(os.path.dirname(os.path.abspath(__file__)))

hostname = socket.gethostname().lower() + '.local'

server = http.server.HTTPServer(('0.0.0.0', 8443), http.server.SimpleHTTPRequestHandler)
ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ctx.load_cert_chain('cert.pem', 'key.pem')
server.socket = ctx.wrap_socket(server.socket, server_side=True)

print(f"\n Finances App - Servidor HTTPS (Face ID)")
print(f" =========================================")
print(f" https://{hostname}:8443/preview.html?v=2")
print(f"\n Prem Ctrl+C per aturar.\n")
server.serve_forever()
