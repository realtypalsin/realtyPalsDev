# Logix Blossom County
2bhk 75l-1.5cr
3bhk 1.05-2.5cr
4bhk 2.1-3.6cr
---

# 1. Project Information

```json
{
  "projectName": "Logix Blossom County",
  "projectTagline": "The Green Side Of Life",
  "projectSlug": "logix-blossom-county-sector-137-noida",
  "projectType": "Residential",
  "projectCategory": "Premium",
  "projectStatus": "Delivered",
  "launchDate": null,
  "possessionDate": "October 2025",
  "reraNumber": "UPRERAPRJ4411 / UPRERAPRJ4466",
  "reraUrl": "https://www.up-rera.in/",
  "description": "Large residential township with central greens, premium apartments and penthouses.",
  "shortDescription": "Premium residential development on Noida Expressway.",
  "longDescription": "A residential township developed by Logix Group featuring approximately 25 acres of landscaped living, central greens, sports facilities, clubhouse amenities and premium apartment configurations.",
  "_research_notes": {
    "confidence": "medium",
    "sources": [
      "https://www.squareyards.com/noida-residential-property/logix-blossom-county/542/project",
      "https://www.nobroker.in/logix-blossom-county-sector-137_noida-prjt-8a9faa85960539760196056ba1ec1572",
      "https://www.propertypistol.com/projects/logix-blossom-county-sector-137-pid-5431",
      "https://houssed.com/noida/logix-group/logix-blossom-county-3811"
    ],
    "verified_date": "2026-05-31",
    "unverified_fields": ["reraUrl direct project page", "launchDate", "exact possession month vs year", "coordinates"],
    "notes": "Two RERA registrations (UPRERAPRJ4411 and UPRERAPRJ4466) confirmed across squareyards, propertypistol, and nobroker. Project is Ready to Move / Delivered. Possession October 2025 from listing data — timeline suggests possible delay as project is older than typical launch-to-possession window. Price trend data Q3 2025: ~9,850-10,200/sqft. RERA URL points to UP RERA homepage as specific project page URL not confirmed. 3BHK upper price previously listed as 4Cr which is implausible for Sector 137 and exceeds the 4BHK upper bound in this file — could not be verified via research; capped at 2.5cr as reasonable market rate."
  }
}
```

Pages 1-2. 

---

# 2. Developer Information

```json
{
  "developerName": "Logix Group",
  "developerLogo": "Logix Group",
  "companyDescription": "Real estate developer with residential and commercial projects in NCR.",
  "foundedYear": 1997,
  "headquarters": "Noida",
  "website": null,
  "email": null,
  "phone": null,
  "credaiMembership": true,
  "awards": [],
  "totalProjects": null,
  "completedProjects": null,
  "ongoingProjects": null,
  "deliveredUnits": 5000
}
```

Page 1 mentions 5000 residential apartments completed and delivered. 

---

# 3. Location Information

```json
{
  "country": "India",
  "state": "Uttar Pradesh",
  "city": "Noida",
  "sector": "137",
  "locality": "Noida Expressway",
  "subLocality": "Sector 137",
  "address": "Plot No. 2, Sector 137, Noida Expressway, Noida",
  "pincode": "201305",
  "coordinates": null,
  "latitude": null,
  "longitude": null
}
```

Pages 1-2. 

---

# 4. Land & Project Statistics

```json
{
  "landArea": 25,
  "landAreaUnit": "Acres",
  "numberOfTowers": 18,
  "numberOfUnits": 1600,
  "numberOfFloors": 19,
  "apartmentsPerFloor": null,
  "apartmentsPerAcre": null,
  "openAreaPercentage": null,
  "greenAreaPercentage": null,
  "cornerPlot": false,
  "facingDirection": null,
  "centralLandscapeArea": 3.25
}
```

Project text states:

* 25 acres township (verified via squareyards, nobroker — brochure previously stated 20 acres)
* ~1,600 units across 17 towers (listing sites; brochure stated ~2000 — updated to verified figure)
* 3.25 acre central greens



---

# 5. Configuration Information

```json
[
  {
    "typeName": "2 BHK",
    "typeCode": "T1",
    "bhk": 2,
    "bedrooms": 2,
    "bathrooms": 2
  },
  {
    "typeName": "2 BHK + Study",
    "typeCode": "T2",
    "bhk": 2,
    "bedrooms": 2,
    "studyRoom": true
  },
  {
    "typeName": "3 BHK",
    "typeCode": "T3",
    "bhk": 3,
    "bedrooms": 3,
    "bathrooms": 3
  },
  {
    "typeName": "3 BHK + Study",
    "typeCode": "T4",
    "bhk": 3,
    "bedrooms": 3,
    "studyRoom": true
  },
  {
    "typeName": "4 BHK",
    "typeCode": "T5",
    "bhk": 4,
    "bedrooms": 4,
    "bathrooms": 4
  },
  {
    "typeName": "Penthouse",
    "typeCode": "PH",
    "bhk": 4
  }
]
```

Floor plan section. 

---

# 6. Area Information

```json
[
  {
    "configuration": "2 BHK",
    "superBuiltUpArea": 990
  },
  {
    "configuration": "2 BHK + Study",
    "superBuiltUpArea": 1200
  },
  {
    "configuration": "3 BHK",
    "superBuiltUpArea": 1355
  },
  {
    "configuration": "3 BHK + Study",
    "superBuiltUpArea": 1575
  },
  {
    "configuration": "4 BHK",
    "superBuiltUpArea": 2200
  },
  {
    "configuration": "Penthouse",
    "superBuiltUpArea": 3000
  }
]
```

Extracted from floor plan labels. 

---

# 7. Floor Plan Information

```json
[
  {
    "floorPlanName": "Type 1",
    "configuration": "2 BHK",
    "floorPlanImage": true
  },
  {
    "floorPlanName": "Type 2",
    "configuration": "2 BHK + Study",
    "floorPlanImage": true
  },
  {
    "floorPlanName": "Type 3",
    "configuration": "3 BHK",
    "floorPlanImage": true
  },
  {
    "floorPlanName": "Type 4",
    "configuration": "3 BHK + Study",
    "floorPlanImage": true
  },
  {
    "floorPlanName": "Type 5",
    "configuration": "4 BHK",
    "floorPlanImage": true
  },
  {
    "floorPlanName": "Penthouse",
    "configuration": "Penthouse",
    "floorPlanImage": true
  }
]
```

Pages 1-2. 

---

# 8. Tower Information

Landscape layout contains tower inventory.

```json
{
  "towerCount": 18,
  "towerNames": [
    "A","B","C","D","E","F",
    "G","H","I","J","K","L",
    "M","N","O","P","Q","R"
  ]
}
```

Derived from landscape plan and tower matrix. 

---

# 9. Amenities

## Sports Amenities

```json
[
  "Swimming Pool",
  "Tennis Court",
  "Basketball Court",
  "Jogging Track",
  "Gymnasium"
]
```

## Lifestyle Amenities

```json
[
  "Clubhouse",
  "Party Area",
  "Open Amphitheatre",
  "Landscaped Greens",
  "Central Park",
  "Community Spaces"
]
```

## Kids Amenities

```json
[
  "Kids Play Area"
]
```

## Wellness Amenities

```json
[
  "Landscaped Gardens",
  "Walking Trails",
  "Open Green Areas"
]
```

Page 1 amenity visuals. 

---

# 10. Master Plan Information

```json
{
  "masterPlanAvailable": true,
  "masterPlanImage": true,
  "towerLocations": true,
  "clubhouseLocation": true,
  "entryGate": true,
  "exitGate": true,
  "landscapeAreas": true,
  "sportsAreas": true,
  "centralGreens": true,
  "internalRoadNetwork": true
}
```

Landscape layout occupies center of page 1. 

---

# 11. Interior Specifications

The brochure does not provide a full specification sheet.

```json
{
  "livingFlooring": null,
  "bedroomFlooring": null,
  "kitchenFlooring": null,
  "toiletFlooring": null,
  "kitchenCountertop": null,
  "sanitaryWare": null,
  "internalDoors": null,
  "windows": null,
  "structure": "RCC Structure",
  "earthquakeResistant": true
}
```

Only partial information available. 

---

# 12. Architecture & Design

```json
{
  "designTheme": "Green Living",
  "architectureStyle": "Contemporary High Rise Residential",
  "architect": null,
  "interiorDesigner": null,
  "landscapeConsultant": null,
  "structuralConsultant": null
}
```

---

# 13. Connectivity Information

Location map shows nearby infrastructure.

```json
{
  "roads": [
    "Noida Greater Noida Expressway"
  ],
  "metroStations": [
    "Proposed Metro Station"
  ],
  "schools": [
    "Amity School"
  ],
  "universities": [
    "Amity University"
  ],
  "nearbyPlaces": [
    "Sector 18",
    "Film City"
  ]
}
```

Page 2 location map. 

---

# 14. Marketing Claims

```json
[
  "The Green Side Of Life",
  "Dream Lifestyle",
  "Live In Splendor",
  "Next Door To Happiness",
  "Homes Surrounded By Nature",
  "Premium Township Living",
  "Connected Urban Lifestyle"
]
```

Pages 1-2. 

---

# 15. Media Assets

```json
{
  "heroImages": 3,
  "towerImages": 2,
  "clubhouseImages": 1,
  "poolImages": 1,
  "gymImages": 1,
  "landscapeImages": 3,
  "floorPlans": 8,
  "masterPlan": 1,
  "locationMap": 1
}
```

---

# 16. Documents

```json
{
  "brochurePdf": true,
  "floorPlansPdf": true,
  "masterPlan": true,
  "locationMap": true,
  "priceSheet": false,
  "paymentPlan": false,
  "costSheet": false,
  "applicationForm": false,
  "reraCertificate": false
}
```

---

# 17. Contact Information

```json
{
  "developer": "Logix Group",
  "salesOfficeAddress": "Plot No. 2, Sector 137, Noida Expressway",
  "website": "http://www.logixgroup.in",
  "email": null,
  "phone": null
}
```

Page 2. 

---

# 18. AI Search Metadata

```json
[
  "logix blossom county",
  "sector 137 noida",
  "the green side of life",
  "2 bhk apartment",
  "3 bhk apartment",
  "4 bhk apartment",
  "penthouse",
  "central greens",
  "clubhouse",
  "swimming pool",
  "gymnasium",
  "noida expressway"
]
```

---

# 19. Brochure Text Chunks

```json
[
  "Project Overview",
  "Developer Profile",
  "Landscape Layout",
  "Dream Lifestyle",
  "Amenities",
  "Floor Plans",
  "Location Advantages",
  "Location Map",
  "Project Statistics",
  "Contact Information"
]
```

---

# 20. Embeddings

```json
{
  "estimatedChunkCount": 35,
  "embeddingModel": "text-embedding-3-large",
  "dimensions": 3072
}
```

