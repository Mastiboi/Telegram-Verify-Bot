from flask import Flask, Response
import time
from playwright.sync_api import sync_playwright

app = Flask(__name__)


def get_svg():
    url = "https://web.telegram.org/a/"  # Replace with the actual URL
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # Set to True for headless mode
        page = browser.new_page()
        page.goto(url)
        time.sleep(20)  # Give time for the page to load
        print("Page loaded")
        last_svg = None  # Store the last SVG to detect changes

        while True:
            try:
                # Wait for the div containing the SVG
                page.wait_for_selector(".qr-container svg", timeout=5000)

                # Extract the SVG content
                svg = page.evaluate('document.querySelector(".qr-container svg")?.outerHTML')

                if svg and svg != last_svg:  # Save only if it has changed
                    with open("scraped_qr.svg", "w", encoding="utf-8") as f:
                        f.write(svg)

                    print("SVG updated and saved as scraped_qr.svg")
                    last_svg = svg  # Update last saved SVG
                

            except Exception as e:
                print(f"Error: {e}")

            time.sleep(3)  # Check for updates every 5 seconds
            print("Checking for updates...")

    return svg

@app.route("/qr.svg")
def serve_svg():
    svg_content = get_svg()
    if svg_content:
        return Response(svg_content, mimetype="image/svg+xml")
    return "No SVG found", 404


if __name__ == "__main__":
    app.run(debug=True, port=5000)

