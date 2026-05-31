import nacl.utils
import nacl.public
import nacl.encoding
import base64

def generate_keypair() -> tuple[str, str]:
    """
    Generate a new NaCl keypair.
    Returns (public_key_b64, private_key_b64).
    Private key is ONLY ever sent to the client — never stored on server.
    """
    keypair    = nacl.public.PrivateKey.generate()
    public_b64 = base64.b64encode(bytes(keypair.public_key)).decode()
    private_b64= base64.b64encode(bytes(keypair)).decode()
    return public_b64, private_b64


def encrypt_message(plaintext: str, sender_private_b64: str,
                    receiver_public_b64: str) -> str:
    """
    Box encrypt a message from sender → receiver.
    Returns base64-encoded ciphertext.
    This runs CLIENT-SIDE in JS (TweetNaCl).
    This Python version is for server-side tests only.
    """
    sender_priv  = nacl.public.PrivateKey(base64.b64decode(sender_private_b64))
    recv_pub     = nacl.public.PublicKey(base64.b64decode(receiver_public_b64))
    box          = nacl.public.Box(sender_priv, recv_pub)
    encrypted    = box.encrypt(plaintext.encode(), encoder=nacl.encoding.Base64Encoder)
    return encrypted.decode()


def decrypt_message(ciphertext_b64: str, receiver_private_b64: str,
                    sender_public_b64: str) -> str:
    """
    Decrypt a Box-encrypted message.
    Runs CLIENT-SIDE in JS. Python version for tests only.
    """
    recv_priv   = nacl.public.PrivateKey(base64.b64decode(receiver_private_b64))
    sender_pub  = nacl.public.PublicKey(base64.b64decode(sender_public_b64))
    box         = nacl.public.Box(recv_priv, sender_pub)
    decrypted   = box.decrypt(ciphertext_b64.encode(),
                              encoder=nacl.encoding.Base64Encoder)
    return decrypted.decode()