import urllib.request
import urllib.error
import json
from datetime import datetime, timedelta
import random

API = "https://dream-wedding-production-89ae.up.railway.app/api"
VENDOR_ID = "20792c76-b265-4063-a356-133ea1c6933b"

def post(endpoint, payload):
    url = f"{API}/{endpoint}"
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req) as r:
            result = json.loads(r.read())
            print(f"✓ {endpoint} — {result.get('success', result)}")
            return result
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"✗ {endpoint} — {e.code}: {body[:200]}")
        return None

def patch(endpoint, payload):
    url = f"{API}/{endpoint}"
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="PATCH")
    try:
        with urllib.request.urlopen(req) as r:
            result = json.loads(r.read())
            print(f"✓ PATCH {endpoint}")
            return result
    except urllib.error.HTTPError as e:
        print(f"✗ PATCH {endpoint} — {e.code}: {e.read().decode()[:200]}")
        return None

def future(days):
    return (datetime.now() + timedelta(days=days)).strftime("%Y-%m-%d")

def past(days):
    return (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")

print("\n── Seeding invoices ──")
invoices = [
    {"vendor_id": VENDOR_ID, "client_name": "Aisha & Kabir Malhotra", "client_phone": "9876543210", "amount": 350000, "description": "Full wedding photography + cinematic film", "invoice_number": "INV-2025-001", "tds_applicable": True, "tds_deducted_by_client": True, "status": "paid"},
    {"vendor_id": VENDOR_ID, "client_name": "Priya & Rohan Sharma", "client_phone": "9871234567", "amount": 280000, "description": "Wedding + pre-wedding shoot", "invoice_number": "INV-2025-002", "tds_applicable": True, "tds_deducted_by_client": False, "status": "paid"},
    {"vendor_id": VENDOR_ID, "client_name": "Neha & Arjun Kapoor", "client_phone": "9845678901", "amount": 420000, "description": "3-day wedding coverage + album", "invoice_number": "INV-2025-003", "tds_applicable": True, "tds_deducted_by_client": True, "status": "paid"},
    {"vendor_id": VENDOR_ID, "client_name": "Meera & Vivek Bose", "client_phone": "9812345678", "amount": 195000, "description": "Wedding photography package", "invoice_number": "INV-2026-001", "tds_applicable": False, "tds_deducted_by_client": False, "status": "unpaid"},
    {"vendor_id": VENDOR_ID, "client_name": "Tanya & Siddharth Jain", "client_phone": "9867890123", "amount": 310000, "description": "Wedding + reception coverage", "invoice_number": "INV-2026-002", "tds_applicable": True, "tds_deducted_by_client": False, "status": "unpaid"},
]
for inv in invoices:
    post("invoices/save", inv)

print("\n── Seeding clients ──")
clients = [
    {"vendor_id": VENDOR_ID, "name": "Aisha & Kabir Malhotra", "phone": "9876543210", "email": "aisha@example.com", "wedding_date": future(45), "venue": "The Leela Ambience, Gurugram", "city": "Delhi NCR", "status": "upcoming", "package": "Gold", "total_amount": 350000, "notes": "Prefer candid style. Bride wants golden hour shots."},
    {"vendor_id": VENDOR_ID, "name": "Priya & Rohan Sharma", "phone": "9871234567", "email": "priya@example.com", "wedding_date": future(72), "venue": "ITC Maurya, Delhi", "city": "Delhi NCR", "status": "upcoming", "package": "Platinum", "total_amount": 280000, "notes": "Large family. Need team of 3."},
    {"vendor_id": VENDOR_ID, "name": "Neha & Arjun Kapoor", "phone": "9845678901", "email": "neha@example.com", "wedding_date": future(110), "venue": "Jai Mahal Palace, Jaipur", "city": "Jaipur", "status": "upcoming", "package": "Platinum", "total_amount": 420000, "notes": "Destination wedding. 3 days."},
    {"vendor_id": VENDOR_ID, "name": "Meera & Vivek Bose", "phone": "9812345678", "email": "meera@example.com", "wedding_date": past(30), "venue": "Taj Hotel, Agra", "city": "Agra", "status": "completed", "package": "Silver", "total_amount": 195000, "notes": ""},
    {"vendor_id": VENDOR_ID, "name": "Tanya & Siddharth Jain", "phone": "9867890123", "email": "tanya@example.com", "wedding_date": future(25), "venue": "Radisson Blu, Noida", "city": "Delhi NCR", "status": "upcoming", "package": "Gold", "total_amount": 310000, "notes": "Engagement + wedding coverage."},
]
for c in clients:
    post("vendor-clients", c)

print("\n── Seeding payment schedules ──")
schedules = [
    {
        "vendor_id": VENDOR_ID,
        "client_name": "Aisha & Kabir Malhotra",
        "total_amount": 350000,
        "instalments": [
            {"label": "Booking Advance", "amount": "100000", "due_date": past(60), "paid": True},
            {"label": "Pre-Wedding", "amount": "125000", "due_date": past(10), "paid": True},
            {"label": "Final Payment", "amount": "125000", "due_date": future(44), "paid": False},
        ]
    },
    {
        "vendor_id": VENDOR_ID,
        "client_name": "Tanya & Siddharth Jain",
        "total_amount": 310000,
        "instalments": [
            {"label": "Booking Advance", "amount": "80000", "due_date": past(20), "paid": True},
            {"label": "Second Instalment", "amount": "115000", "due_date": future(10), "paid": False},
            {"label": "Final Payment", "amount": "115000", "due_date": future(24), "paid": False},
        ]
    },
    {
        "vendor_id": VENDOR_ID,
        "client_name": "Priya & Rohan Sharma",
        "total_amount": 280000,
        "instalments": [
            {"label": "Booking Advance", "amount": "70000", "due_date": past(15), "paid": True},
            {"label": "Final Payment", "amount": "210000", "due_date": future(71), "paid": False},
        ]
    },
]
for s in schedules:
    post("payment-schedules", s)

print("\n── Seeding expenses ──")
expenses = [
    {"vendor_id": VENDOR_ID, "description": "Second shooter — Aisha wedding", "amount": 25000, "category": "Team", "date": past(5)},
    {"vendor_id": VENDOR_ID, "description": "Travel — Jaipur recce", "amount": 8500, "category": "Travel", "date": past(12)},
    {"vendor_id": VENDOR_ID, "description": "Hard drives (2TB x2)", "amount": 12000, "category": "Equipment", "date": past(20)},
    {"vendor_id": VENDOR_ID, "description": "Album printing — Meera & Vivek", "amount": 18000, "category": "Production", "date": past(8)},
    {"vendor_id": VENDOR_ID, "description": "Lightroom subscription", "amount": 2000, "category": "Software", "date": past(30)},
]
for e in expenses:
    post("expenses", e)

print("\nDone. Refresh the demo dashboard.")
