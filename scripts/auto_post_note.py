import os
import sys
import time
import argparse
import json
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

# Reuse existing cookie logic
# Corrected path for importing or reusing note_cookies.pkl
ROOT_DIR = Path(__file__).parent.parent.parent.parent.parent # 2nd-Brain root
DEVTOOLS_DIR = ROOT_DIR / "00_システム" / "devtools"
COOKIE_FILE = DEVTOOLS_DIR / 'note_cookies.pkl'
DATA_FILE = Path(__file__).parent.parent / "data" / "articles.json"

def update_article_status(id, published_url):
    if not DATA_FILE.exists():
        return
    
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        articles = json.load(f)
    
    for article in articles:
        if article['id'] == id:
            article['status'] = 'posted'
            article['published_url'] = published_url
            break
            
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(articles, f, indent=2, ensure_ascii=False)

def post_existing_draft(url, article_id):
    options = webdriver.ChromeOptions()
    # options.add_argument('--headless')
    options.add_argument('--window-size=1920,1080')
    options.add_argument('--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    
    try:
        driver.get("https://note.com/")
        time.sleep(2)
        
        # Load cookies
        import pickle
        if COOKIE_FILE.exists():
            with open(COOKIE_FILE, 'rb') as f:
                cookies = pickle.load(f)
                for cookie in cookies:
                    driver.add_cookie(cookie)
            driver.refresh()
            time.sleep(3)

        print(f"Navigating to draft: {url}")
        driver.get(url)
        time.sleep(5)

        # Click "公開設定" (Publish Settings)
        # Note: Selector might need adjustment
        publish_settings_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(., '公開設定')]"))
        )
        publish_settings_btn.click()
        time.sleep(3)

        # Click final "投稿" (Publish) button
        # Usually inside a modal or different area
        publish_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(., '投稿')]"))
        )
        publish_btn.click()
        print("Publish button clicked. Waiting for redirect...")
        time.sleep(10)

        final_url = driver.current_url
        if "/n/" in final_url:
            print(f"Successfully published: {final_url}")
            update_article_status(article_id, final_url)
        else:
            print(f"Failed to detect published URL. Current URL: {final_url}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        driver.quit()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    parser.add_argument("--id", required=True)
    args = parser.parse_args()
    post_existing_draft(args.url, args.id)
