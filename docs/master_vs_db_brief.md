# Technical Brief: Database vs Local Master JSON Synchronization

## Overview
This brief summarizes the alignment and structural discrepancies between the live Supabase PostgreSQL database and the local master JSON dataset stored in `newProj/75/`. 

---

## 1. Inventory Summary

| Metric | Count |
| :--- | :--- |
| **Total Master JSON Files (`newProj/75/`)** | 57 files |
| **Total Projects in Local Master JSON Files** | 322 records |
| **Total Verified Projects in Live Database** | 280 records |
| **Projects Matched in Both DB and Master JSON** | 207 records |
| **Projects Present in Database BUT MISSING from Local Master Files** | **73 projects** |
| **Projects Present in Local Master Files BUT MISSING from Database** | **17 projects** |

---

## 2. Projects in Database but MISSING from Local Master Files

The following **73 projects** exist in the active production database, but are not tracked in the local `newProj/75/` JSON master files:

| # | Project Name | Slug | Sector | City | Min Price (Cr) | Builder |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **Jaypee Greens Wish Town Klassic** | `jaypee-greens-wish-town-klassic-sector-134` | Sector 134 | Noida | ₹0.95 Cr | Jaypee Greens (Suraksha Group Resolution) |
| 2 | **ATS Destinaire** | `ats-destinaire-sector-1` | Sector 1 | Greater Noida West | ₹1.95 Cr | ATS Infrastructure |
| 3 | **Homes 121** | `homes-121-sector-121` | Sector 121 | Noida | ₹1.02 Cr | ABA Corp |
| 4 | **Godrej Golf Links & The Crest** | `godrej-golf-links-the-crest-sector-27` | Sector 27 | Greater Noida | ₹1.85 Cr | Godrej Properties |
| 5 | **Prateek Fedicia** | `prateek-fedicia-sector-120` | Sector 120 | Noida | ₹1.45 Cr | Prateek Group |
| 6 | **ABA Cleo County** | `aba-cleo-county-sector-121` | Sector 121 | Noida | ₹1.65 Cr | ABA Corp |
| 7 | **Jaypee Greens Kosmos** | `jaypee-greens-kosmos-sector-134` | Sector 134 | Noida | ₹0.85 Cr | Jaypee Greens (Suraksha Group Resolution) |
| 8 | **Pan Oasis** | `pan-oasis-sector-70` | Sector 70 | Noida | ₹0.98 Cr | PAN Realtors |
| 9 | **Nimbus Express Park View 1 & 2** | `nimbus-express-park-view-sector-chi-5` | Chi 5 | Greater Noida | ₹0.95 Cr | Nimbus Group (IITL Nimbus) |
| 10 | **Sethi Max Royal** | `sethi-max-royal-sector-76` | Sector 76 | Noida | ₹1.08 Cr | Sethi Group |
| 11 | **Hyde Park** | `hyde-park-sector-78` | Sector 78 | Noida | ₹1.15 Cr | The 3C Company |
| 12 | **Gulshan Dynasty** | `gulshan-dynasty-sector-144` | Sector 144 | Noida | ₹6.5 Cr | Gulshan Homz |
| 13 | **Ace Divino** | `ace-divino-sector-1` | Sector 1 | Greater Noida West | ₹1.15 Cr | ACE Group |
| 14 | **Gaur Saundaryam** | `gaur-saundaryam-sector-16b` | Sector 16B | Greater Noida West | ₹1.35 Cr | Gaurs Group |
| 15 | **ATS Dolce** | `ats-dolce-sector-zeta-1` | Zeta 1 | Greater Noida | ₹1.15 Cr | ATS Infrastructure |
| 16 | **Supertech Supernova** | `supertech-supernova-sector-94` | Sector 94 | Noida | ₹1.85 Cr | Supertech Limited |
| 17 | **Panchsheel Greens 1 & 2** | `panchsheel-greens-sector-16` | Sector 16 | Greater Noida West | ₹0.68 Cr | Panchsheel Buildtech |
| 18 | **Solitairian City** | `solitairian-city-sector-25` | Sector 25 | Yamuna Expressway | ₹0.62 Cr | Solitairian Group |
| 19 | **RG Luxury Homes** | `rg-luxury-homes-sector-16b` | Sector 16B | Greater Noida West | ₹0.72 Cr | RG Group |
| 20 | **Saya Zion** | `saya-zion-sector-16b` | Sector 16B | Greater Noida West | ₹1.15 Cr | Saya Homes |
| 21 | **Kalpataru Vista** | `kalpataru-vista-sector-128` | Sector 128 | Noida | ₹4.95 Cr | Kalpataru Group |
| 22 | **Gaur Grandeur** | `gaur-grandeur-sector-119` | Sector 119 | Noida | ₹1.05 Cr | Gaurs Group |
| 23 | **Nirala Aspire** | `nirala-aspire-sector-16` | Sector 16 | Greater Noida West | ₹0.68 Cr | Nirala World |
| 24 | **Jaypee Greens Pavilion Court** | `jaypee-greens-pavilion-court-sector-128` | Sector 128 | Noida | ₹1.45 Cr | Jaypee Greens (Suraksha Group Resolution) |
| 25 | **Purvanchal Royal City** | `purvanchal-royal-city-sector-chi-5` | Chi 5 | Greater Noida | ₹1.45 Cr | Purvanchal Projects |
| 26 | **Eldeco Mystic Greens** | `eldeco-mystic-greens-sector-omicron-1` | Omicron 1 | Greater Noida | ₹1.05 Cr | Eldeco Group |
| 27 | **Amrapali Eden Park** | `amrapali-eden-park-sector-50` | Sector 50 | Noida | ₹1.85 Cr | Amrapali Group (NBCC Supervised) |
| 28 | **Fusion Homes** | `fusion-homes-techzone-4` | Techzone 4 | Greater Noida West | ₹0.88 Cr | Fusion Buildtech |
| 29 | **Gulshan Botnia** | `gulshan-botnia-sector-144` | Sector 144 | Noida | ₹1.35 Cr | Gulshan Homz |
| 30 | **Purvanchal Silver City 1 & 2** | `purvanchal-silver-city-sector-chi-5` | Chi 5 | Greater Noida | ₹1.15 Cr | Purvanchal Projects |
| 31 | **ATS Knightsbridge** | `ats-knightsbridge-sector-124` | Sector 124 | Noida | ₹12.5 Cr | ATS Infrastructure |
| 32 | **Jaypee Greens Kalypso Court** | `jaypee-greens-kalypso-court-sector-128` | Sector 128 | Noida | ₹2.4 Cr | Jaypee Greens (Suraksha Group Resolution) |
| 33 | **Jaypee Greens Aman** | `jaypee-greens-aman-sector-151` | Sector 151 | Noida | ₹0.75 Cr | Jaypee Greens (Suraksha Group Resolution) |
| 34 | **Ace Starlit** | `ace-starlit-sector-152` | Sector 152 | Noida | ₹1.85 Cr | ACE Group |
| 35 | **Spring Meadows** | `spring-meadows-sector-1` | Sector 1 | Greater Noida West | ₹0.65 Cr | Spring Group |
| 36 | **Orris Greenbay Golf Homes** | `orris-greenbay-golf-homes-sector-22d` | Sector 22D | Yamuna Expressway | ₹0.62 Cr | Orris Infrastructure |
| 37 | **Supertech Golf Country** | `supertech-golf-country-sector-22d` | Sector 22D | Yamuna Expressway | ₹0.58 Cr | Supertech Limited |
| 38 | **Eldeco Utopia** | `eldeco-utopia-sector-93a` | Sector 93A | Noida | ₹2.1 Cr | Eldeco Group |
| 39 | **Supertech Upcountry (Golf Village)** | `supertech-upcountry-golf-village-sector-17a` | Sector 17A | Yamuna Expressway | ₹0.55 Cr | Supertech Limited |
| 40 | **Trident Embassy** | `trident-embassy-sector-1` | Sector 1 | Greater Noida West | ₹0.68 Cr | Trident Group |
| 41 | **Gaur Yamuna City (7th Parkview)** | `gaur-yamuna-city-7th-parkview-sector-19` | Sector 19 | Yamuna Expressway | ₹0.65 Cr | Gaurs Group |
| 42 | **Parx Laureate** | `parx-laureate-sector-108` | Sector 108 | Noida | ₹3.8 Cr | Laureate Buildwell |
| 43 | **Max Estate 128** | `max-estate-128-sector-128` | Sector 128 | Noida | ₹6.2 Cr | Max Estates |
| 44 | **ATS Green Paradiso** | `ats-green-paradiso-sector-chi-4` | Chi 4 | Greater Noida | ₹1.45 Cr | ATS Infrastructure |
| 45 | **Jaypee Greens Golf Course Residences** | `jaypee-greens-golf-course-pari-chowk` | Pari Chowk | Greater Noida | ₹2.8 Cr | Jaypee Greens (Suraksha Group Resolution) |
| 46 | **Panchsheel Hynish** | `panchsheel-hynish-sector-1` | Sector 1 | Greater Noida West | ₹0.75 Cr | Panchsheel Buildtech |
| 47 | **Mahagun Mywoods** | `mahagun-mywoods-sector-16b` | Sector 16B | Greater Noida West | ₹0.85 Cr | Mahagun Group |
| 48 | **SKA Orion** | `ska-orion-sector-143b` | Sector 143B | Noida | ₹1.25 Cr | SKA Group |
| 49 | **Godrej Jardinia** | `godrej-jardinia-sector-146` | Sector 146 | Noida | ₹3.2 Cr | Godrej Properties |
| 50 | **Samridhi Luxuriya Avenue** | `samridhi-luxuriya-avenue-sector-150` | Sector 150 | Noida | ₹1.35 Cr | Samridhi Group |
| 51 | **Prateek Stylome** | `prateek-stylome-sector-45` | Sector 45 | Noida | ₹2.3 Cr | Prateek Group |
| 52 | **Gardenia Glory** | `gardenia-glory-sector-46` | Sector 46 | Noida | ₹1.05 Cr | AIMS Max Gardenia Developers |
| 53 | **Prateek Laurel** | `prateek-laurel-sector-120` | Sector 120 | Noida | ₹1.05 Cr | Prateek Group |
| 54 | **Eros Sampoornam** | `eros-sampoornam-sector-2` | Sector 2 | Greater Noida West | ₹0.72 Cr | Eros Group |
| 55 | **Ace City** | `ace-city-sector-1` | Sector 1 | Greater Noida West | ₹0.85 Cr | ACE Group |
| 56 | **Migsun Ultimo** | `migsun-ultimo-sector-omicron-3` | Omicron 3 | Greater Noida | ₹0.82 Cr | Migsun Group |
| 57 | **Paramount Golf Foreste** | `paramount-golf-foreste-sector-zeta-2` | Zeta 2 | Greater Noida | ₹0.85 Cr | Paramount Group |
| 58 | **Jaypee Sports City (Kassia)** | `jaypee-sports-city-kassia-sector-25` | Sector 25 | Yamuna Expressway | ₹0.65 Cr | Jaypee Greens (Suraksha Group Resolution) |
| 59 | **Stellar MI City Homes** | `stellar-mi-city-homes-sector-omicron-3` | Omicron 3 | Greater Noida | ₹0.85 Cr | Stellar Group |
| 60 | **Ace Aspire** | `ace-aspire-techzone-4` | Techzone 4 | Greater Noida West | ₹0.92 Cr | ACE Group |
| 61 | **Ace Platinum** | `ace-platinum-sector-zeta-1` | Zeta 1 | Greater Noida | ₹0.88 Cr | ACE Group |
| 62 | **Amrapali Sapphire** | `amrapali-sapphire-sector-45` | Sector 45 | Noida | ₹1.25 Cr | Amrapali Group (NBCC Supervised) |
| 63 | **RG Residency** | `rg-residency-sector-120` | Sector 120 | Noida | ₹0.98 Cr | RG Group |
| 64 | **ATS Nobility** | `ats-nobility-sector-4` | Sector 4 | Greater Noida West | ₹1.65 Cr | ATS Infrastructure |
| 65 | **Eldeco Aamantran** | `eldeco-aamantran-sector-119` | Sector 119 | Noida | ₹1.15 Cr | Eldeco Group |
| 66 | **ATS Greens Village** | `ats-greens-village-sector-93a` | Sector 93A | Noida | ₹2.4 Cr | ATS Infrastructure |
| 67 | **Eldeco Green Meadows** | `eldeco-green-meadows-sector-pi-1` | Pi 1 | Greater Noida | ₹1.1 Cr | Eldeco Group |
| 68 | **Omaxe Forest Spa** | `omaxe-forest-spa-sector-93b` | Sector 93B | Noida | ₹4.8 Cr | Omaxe Limited |
| 69 | **ATS Pristine & Golf Meadows** | `ats-pristine-golf-meadows-sector-150` | Sector 150 | Noida | ₹2.2 Cr | ATS Infrastructure |
| 70 | **Supertech Capetown** | `supertech-capetown-sector-74` | Sector 74 | Noida | ₹0.95 Cr | Supertech Limited |
| 71 | **Migsun Vilaasa** | `migsun-vilaasa-sector-eta-2` | Eta 2 | Greater Noida | ₹0.72 Cr | Migsun Group |
| 72 | **Hawelia Valencia Homes** | `hawelia-valencia-homes-sector-1` | Sector 1 | Greater Noida West | ₹0.7 Cr | Hawelia Group |
| 73 | **Sikka Kaamna Greens** | `sikka-kaamna-greens-sector-143` | Sector 143 | Noida | ₹0.95 Cr | Sikka Group |

---

## 3. Projects in Local Master Files but MISSING from Live Database

1. **Parx Laureate** (`parx-laureate-sector-108-noida`) — Source file: `propfyndr_sector10_greaternoidawest_master_data.json`
2. **Gaur Grandeur** (`gaur-grandeur-sector-119-noida`) — Source file: `propfyndr_sector1_greaternoidawest_master_data.json`
3. **Eldeco Aamantran** (`eldeco-aamantran-sector-119-noida`) — Source file: `propfyndr_sector1_greaternoidawest_master_data.json`
4. **RG Residency** (`rg-residency-sector-120-noida`) — Source file: `propfyndr_sector12_greaternoidawest_master_data.json`
5. **Prateek Laurel** (`prateek-laurel-sector-120-noida`) — Source file: `propfyndr_sector12_greaternoidawest_master_data.json`
6. **Homes 121** (`homes-121-sector-121-noida`) — Source file: `propfyndr_sector12_greaternoidawest_master_data.json`
7. **Paras Tierea** (`paras-tierea-sector-137`) — Source file: `propfyndr_sector137_noida_master_data.json`
8. **Supertech Ecociti** (`supertech-ecociti-sector-137`) — Source file: `propfyndr_sector137_noida_master_data.json`
9. **Gulshan Ikebana** (`gulshan-ikebana-sector-143`) — Source file: `propfyndr_sector143_noida_master_data.json`
10. **Gaur City 2 - 16th Avenue** (`gaur-city-2-16th-avenue`) — Source file: `propfyndr_sector16c_greaternoidawest_master_data.json`
11. **ACE Divino** (`ace-divino-sector-1-greater-noida-west`) — Source file: `propfyndr_sector1_greaternoidawest_master_data.json`
12. **ATS Dolce** (`ats-dolce-zeta-1`) — Source file: `propfyndr_zeta1_greaternoida_master_data.json`
13. **Stellar Jeevan** (`stellar-jeevan-sector-1`) — Source file: `propfyndr_sector1_greaternoidawest_master_data.json`
14. **Prateek Stylome** (`prateek-stylome-sector-45-noida`) — Source file: `propfyndr_sector45_noida_master_data.json`
15. **Pan Oasis** (`pan-oasis-sector-70-noida`) — Source file: `propfyndr_sector70_noida_master_data.json`
16. **Supertech Capetown** (`supertech-capetown-sector-74-noida`) — Source file: `propfyndr_sector74_noida_master_data.json`
17. **Sethi Max Royal** (`sethi-max-royal-sector-76-noida`) — Source file: `propfyndr_sector76_noida_master_data.json`

---

## 4. Key Data Divergences & Remediation Log

During recent production alignment sessions, the live database underwent crucial data veracity fixes:
1. **Builder Track Record Cleanup**: Removed 538 unverified auto-generated names and cleared fictitious defaults (`delivered_projects_count=18`). 268 verified projects remain linked.
2. **Corporate CIN & RERA Promoter ID Sanitization**: Cleared 28 shared/contradictory CIN entries (e.g. Amrapali & 3C sharing identical CINs). 89 authentic CINs retained.
3. **Litigation & Insolvency Accuracy**: 6 distressed developers explicitly flagged (`Supertech`, `Amrapali`, `Unitech`, `Jaypee`, `3C`, `Logix`). 239 projects confirmed clean, 41 carrying real litigation counts.

---

## 5. Action Items for the Database Management Agent

1. **Backport DB-Only Projects**: Export the **73 missing projects** from the database and generate corresponding JSON master files in `newProj/75/`.
2. **Synchronize Enriched Fields**: Update local JSON templates to mirror live Prisma fields:
   - `insolvency_history` (`Boolean`)
   - `legal_flag` (`String?`)
   - `litigation_count` (`Int?`)
   - `flood_waterlogging_risk` (`String?`)
3. **Maintain Master JSON as Single Source of Truth**: Ensure any new builder onboarding includes genuine CINs, verified RERA promoter numbers, and exact unit layout pricing.
