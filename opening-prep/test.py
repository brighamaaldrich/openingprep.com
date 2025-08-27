import requests
import csv
import time

def get_chess_com_country_stats():
    """
    Fetches the number of users for each country on Chess.com and saves the data to a CSV file.
    """
    # Base URL for the Chess.com API
    base_url = "https://api.chess.com/pub/"
    
    # Set a User-Agent header to avoid 403 Forbidden errors
    headers = {
        "User-Agent": "MyChessStatsApp/1.0 (your-username; your-contact-email@example.com)"
    }

    # There is no API endpoint to get all countries, so we use a predefined list of country codes.
    # This list is not exhaustive but covers most countries.
    country_codes = [
        "AF", "AX", "AL", "DZ", "AS", "AD", "AO", "AI", "AQ", "AG", "AR", "AM", "AW", "AU", "AT", "AZ",
        "BS", "BH", "BD", "BB", "BY", "BE", "BZ", "BJ", "BM", "BT", "BO", "BQ", "BA", "BW", "BV", "BR",
        "IO", "BN", "BG", "BF", "BI", "CV", "KH", "CM", "CA", "KY", "CF", "TD", "CL", "CN", "CX", "CC",
        "CO", "KM", "CG", "CD", "CK", "CR", "CI", "HR", "CU", "CW", "CY", "CZ", "DK", "DJ", "DM", "DO",
        "EC", "EG", "SV", "GQ", "ER", "EE", "SZ", "ET", "FK", "FO", "FJ", "FI", "FR", "GF", "PF", "TF",
        "GA", "GM", "GE", "DE", "GH", "GI", "GR", "GL", "GD", "GP", "GU", "GT", "GG", "GN", "GW", "GY",
        "HT", "HM", "VA", "HN", "HK", "HU", "IS", "IN", "ID", "IR", "IQ", "IE", "IM", "IL", "IT", "JM",
        "JP", "JE", "JO", "KZ", "KE", "KI", "KP", "KR", "KW", "KG", "LA", "LV", "LB", "LS", "LR", "LY",
        "LI", "LT", "LU", "MO", "MG", "MW", "MY", "MV", "ML", "MT", "MH", "MQ", "MR", "MU", "YT", "MX",
        "FM", "MD", "MC", "MN", "ME", "MS", "MA", "MZ", "MM", "NA", "NR", "NP", "NL", "NC", "NZ", "NI",
        "NE", "NG", "NU", "NF", "MK", "MP", "NO", "OM", "PK", "PW", "PS", "PA", "PG", "PY", "PE", "PH",
        "PN", "PL", "PT", "PR", "QA", "RE", "RO", "RU", "RW", "BL", "SH", "KN", "LC", "MF", "PM", "VC",
        "WS", "SM", "ST", "SA", "SN", "RS", "SC", "SL", "SG", "SX", "SK", "SI", "SB", "SO", "ZA", "GS",
        "SS", "ES", "LK", "SD", "SR", "SJ", "SE", "CH", "SY", "TW", "TJ", "TZ", "TH", "TL", "TG", "TK",
        "TO", "TT", "TN", "TR", "TM", "TC", "TV", "UG", "UA", "AE", "GB", "US", "UM", "UY", "UZ", "VU",
        "VE", "VN", "VG", "VI", "WF", "EH", "YE", "ZM", "ZW"
    ]

    # Prepare data for the CSV file
    country_data = []

    # Iterate over each country code and get the number of users
    for country_code in country_codes:
        try:
            # Get the full country name from its profile URL
            country_profile_url = base_url + f"country/{country_code}"
            country_name_response = requests.get(country_profile_url, headers=headers)
            country_name_response.raise_for_status()
            country_name = country_name_response.json().get("name")

            # Get the list of players for the current country
            players_url = base_url + f"country/{country_code}/players"
            response = requests.get(players_url, headers=headers)
            response.raise_for_status()
            players = response.json().get("players", [])
            
            # Get the number of users
            num_users = len(players)

            # Add the data to our list
            country_data.append({"country": country_name, "num_users": num_users})

            print(f"Successfully fetched data for {country_name} ({country_code})")

            # Be respectful of the API and add a delay between requests
            time.sleep(0.5)

        except requests.exceptions.RequestException as e:
            print(f"Error fetching data for country code {country_code}: {e}")
            continue

    # Write the data to a CSV file
    try:
        with open("chess_com_country_stats.csv", "w", newline="", encoding="utf-8") as csvfile:
            fieldnames = ["country", "num_users"]
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)

            writer.writeheader()
            for data in country_data:
                writer.writerow(data)
        
        print("\nSuccessfully saved data to chess_com_country_stats.csv")

    except IOError as e:
        print(f"Error writing to CSV file: {e}")

if __name__ == "__main__":
    get_chess_com_country_stats()
