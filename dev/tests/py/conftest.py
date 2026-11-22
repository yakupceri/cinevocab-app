"""Test ortami: site dosyalarini DEGISTIRMEDEN, kok klasorden icerik aktarir. Veritabani gerekmez."""
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)
sys.dont_write_bytecode = True
