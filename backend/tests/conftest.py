"""
Pytest configuration for VaaniShield tests.
Ensures repository root and backend directory are in sys.path for all tests.
"""

import os
import sys

_tests_dir = os.path.dirname(os.path.abspath(__file__))
_backend_dir = os.path.dirname(_tests_dir)
_repo_root = os.path.dirname(_backend_dir)

if _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)
