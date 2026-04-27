import subprocess, sys, os, socket

try:
    from cryptography import x509
    from cryptography.x509.oid import NameOID
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    import datetime, ipaddress
except ImportError:
    print("Instal·lant cryptography...")
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'cryptography'])
    from cryptography import x509
    from cryptography.x509.oid import NameOID
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    import datetime, ipaddress

hostname = socket.gethostname().lower() + '.local'
local_ip = '192.168.1.34'
script_dir = os.path.dirname(os.path.abspath(__file__))

print(f"\nGenerant certificat per '{hostname}' i {local_ip}...")

key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

subject = issuer = x509.Name([
    x509.NameAttribute(NameOID.COMMON_NAME, 'Finances App'),
    x509.NameAttribute(NameOID.ORGANIZATION_NAME, 'Finances App'),
])

cert = (x509.CertificateBuilder()
    .subject_name(subject)
    .issuer_name(issuer)
    .public_key(key.public_key())
    .serial_number(x509.random_serial_number())
    .not_valid_before(datetime.datetime.utcnow())
    .not_valid_after(datetime.datetime.utcnow() + datetime.timedelta(days=825))
    .add_extension(x509.SubjectAlternativeName([
        x509.DNSName(hostname),
        x509.DNSName('localhost'),
        x509.IPAddress(ipaddress.IPv4Address(local_ip)),
    ]), critical=False)
    .add_extension(x509.BasicConstraints(ca=True, path_length=None), critical=True)
    .add_extension(x509.KeyUsage(
        digital_signature=True, key_cert_sign=True, crl_sign=True,
        content_commitment=False, key_encipherment=False, data_encipherment=False,
        key_agreement=False, encipher_only=False, decipher_only=False
    ), critical=True)
    .sign(key, hashes.SHA256()))

with open(os.path.join(script_dir, 'cert.pem'), 'wb') as f:
    f.write(cert.public_bytes(serialization.Encoding.PEM))
with open(os.path.join(script_dir, 'key.pem'), 'wb') as f:
    f.write(key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.TraditionalOpenSSL,
        serialization.NoEncryption()
    ))

print(f"\n cert.pem i key.pem creats correctament!")
print(f"\n Hostname mDNS: {hostname}")
print(f" URL de la app: https://{hostname}:8443/preview.html?v=2")
print(f"\n Seguent pas: instal·la cert.pem al iPhone (veure instruccions).")
