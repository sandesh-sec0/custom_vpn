import socket
import sys

def start_echo_server(host='127.0.0.1', port=9000):
    """A simple echo server that sends back whatever it receives."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            s.bind((host, port))
            s.listen(1)
            print(f"[*] Echo Server listening on {host}:{port}")
            print("[*] Waiting for a connection through the VPN...")
            
            while True:
                conn, addr = s.accept()
                with conn:
                    print(f"[*] Connected by {addr}")
                    while True:
                        data = conn.recv(1024)
                        if not data:
                            break
                        print(f"[*] Received: {data.decode(errors='replace')}")
                        conn.sendall(data)
                        print("[*] Echoed back to VPN.")
    except Exception as e:
        print(f"[!] Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    start_echo_server()
