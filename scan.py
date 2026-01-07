import socket
import threading

TARGET_PORT = 45000
SUBNET = "192.168.1."

def scan(ip):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(0.3)
    try:
        sock.connect((ip, TARGET_PORT))
        print("[OPEN]", ip)
    except:
        pass
    finally:
        sock.close()

threads = []

for i in range(1, 255):
    ip = SUBNET + str(i)
    t = threading.Thread(target=scan, args=(ip,))
    threads.append(t)
    t.start()

for t in threads:
    t.join()
