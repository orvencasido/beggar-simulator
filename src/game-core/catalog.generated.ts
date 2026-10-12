import type { Catalog } from './types.ts';
export const defaultCatalog: Catalog = {
  "manifest": {
    "version": "lifetime_v2_1",
    "schemaVersion": 2,
    "engineVersion": 2,
    "releaseNotes": "Finite fresh lives, education, bank, opportunities and legacy."
  },
  "careers": [
    {
      "id": "survival",
      "name": "A beginning",
      "available": true,
      "icon": "briefcase"
    },
    {
      "id": "delivery",
      "name": "Delivery",
      "available": true,
      "icon": "briefcase"
    },
    {
      "id": "freelance",
      "name": "Freelance",
      "available": true,
      "icon": "briefcase"
    },
    {
      "id": "trades",
      "name": "Trades",
      "available": true,
      "icon": "briefcase"
    },
    {
      "id": "technology",
      "name": "Technology",
      "available": true,
      "icon": "briefcase"
    },
    {
      "id": "business",
      "name": "Business",
      "available": true,
      "icon": "briefcase"
    },
    {
      "id": "healthcare",
      "name": "Healthcare",
      "available": true,
      "icon": "briefcase"
    },
    {
      "id": "engineering",
      "name": "Engineering",
      "available": true,
      "icon": "briefcase"
    },
    {
      "id": "creative",
      "name": "Creative",
      "available": true,
      "icon": "briefcase"
    }
  ],
  "jobs": [
    {
      "id": "begging",
      "name": "Begging",
      "careerId": "survival",
      "baseEarnings": "12",
      "maxEarnings": "18",
      "hungerStrain": 0,
      "sanityCost": 1,
      "requirements": {
        "itemIds": [],
        "qualificationIds": [],
        "familyExperienceDays": 0
      },
      "available": true,
      "icon": "briefcase"
    },
    {
      "id": "newspaper",
      "name": "Newspaper delivery",
      "careerId": "delivery",
      "baseEarnings": "60",
      "maxEarnings": "60",
      "hungerStrain": 1,
      "sanityCost": 1,
      "requirements": {
        "itemIds": [
          "bike"
        ],
        "qualificationIds": [],
        "familyExperienceDays": 0
      },
      "available": true,
      "icon": "briefcase"
    },
    {
      "id": "courier",
      "name": "Courier",
      "careerId": "delivery",
      "baseEarnings": "140",
      "maxEarnings": "140",
      "hungerStrain": 2,
      "sanityCost": 2,
      "requirements": {
        "itemIds": [
          "bike",
          "delivery_kit"
        ],
        "qualificationIds": [],
        "familyExperienceDays": 0
      },
      "available": true,
      "icon": "briefcase"
    },
    {
      "id": "freelancer",
      "name": "Freelancer",
      "careerId": "freelance",
      "baseEarnings": "260",
      "maxEarnings": "260",
      "hungerStrain": 1,
      "sanityCost": 3,
      "requirements": {
        "itemIds": [
          "laptop"
        ],
        "qualificationIds": [],
        "familyExperienceDays": 0
      },
      "available": true,
      "icon": "briefcase"
    },
    {
      "id": "mechanic",
      "name": "Mechanic",
      "careerId": "trades",
      "baseEarnings": "350",
      "maxEarnings": "350",
      "hungerStrain": 2,
      "sanityCost": 2,
      "requirements": {
        "itemIds": [
          "trade_tools"
        ],
        "qualificationIds": [
          "trade_certificate"
        ],
        "familyExperienceDays": 0
      },
      "available": true,
      "icon": "briefcase"
    },
    {
      "id": "trade_specialist",
      "name": "Trade specialist",
      "careerId": "trades",
      "baseEarnings": "650",
      "maxEarnings": "650",
      "hungerStrain": 2,
      "sanityCost": 3,
      "requirements": {
        "itemIds": [
          "trade_tools"
        ],
        "qualificationIds": [
          "trade_certificate"
        ],
        "familyExperienceDays": 1000
      },
      "available": true,
      "icon": "briefcase"
    },
    {
      "id": "master_tradesperson",
      "name": "Master tradesperson",
      "careerId": "trades",
      "baseEarnings": "1050",
      "maxEarnings": "1050",
      "hungerStrain": 2,
      "sanityCost": 3,
      "requirements": {
        "itemIds": [
          "trade_tools"
        ],
        "qualificationIds": [
          "trade_certificate"
        ],
        "familyExperienceDays": 3000
      },
      "available": true,
      "icon": "briefcase"
    },
    {
      "id": "junior_developer",
      "name": "Junior developer",
      "careerId": "technology",
      "baseEarnings": "550",
      "maxEarnings": "550",
      "hungerStrain": 1,
      "sanityCost": 3,
      "requirements": {
        "itemIds": [
          "laptop"
        ],
        "qualificationIds": [
          "computing_degree"
        ],
        "familyExperienceDays": 0
      },
      "available": true,
      "icon": "briefcase"
    },
    {
      "id": "software_engineer",
      "name": "Software engineer",
      "careerId": "technology",
      "baseEarnings": "900",
      "maxEarnings": "900",
      "hungerStrain": 1,
      "sanityCost": 4,
      "requirements": {
        "itemIds": [
          "laptop"
        ],
        "qualificationIds": [
          "computing_degree"
        ],
        "familyExperienceDays": 1500
      },
      "available": true,
      "icon": "briefcase"
    },
    {
      "id": "senior_engineer",
      "name": "Senior engineer",
      "careerId": "technology",
      "baseEarnings": "1450",
      "maxEarnings": "1450",
      "hungerStrain": 1,
      "sanityCost": 4,
      "requirements": {
        "itemIds": [
          "laptop"
        ],
        "qualificationIds": [
          "computing_degree"
        ],
        "familyExperienceDays": 4500
      },
      "available": true,
      "icon": "briefcase"
    },
    {
      "id": "business_analyst",
      "name": "Business analyst",
      "careerId": "business",
      "baseEarnings": "520",
      "maxEarnings": "520",
      "hungerStrain": 1,
      "sanityCost": 3,
      "requirements": {
        "itemIds": [
          "laptop"
        ],
        "qualificationIds": [
          "business_degree"
        ],
        "familyExperienceDays": 0
      },
      "available": true,
      "icon": "briefcase"
    },
    {
      "id": "manager",
      "name": "Manager",
      "careerId": "business",
      "baseEarnings": "850",
      "maxEarnings": "850",
      "hungerStrain": 1,
      "sanityCost": 4,
      "requirements": {
        "itemIds": [
          "laptop"
        ],
        "qualificationIds": [
          "business_degree"
        ],
        "familyExperienceDays": 1500
      },
      "available": true,
      "icon": "briefcase"
    },
    {
      "id": "executive",
      "name": "Executive",
      "careerId": "business",
      "baseEarnings": "1400",
      "maxEarnings": "1400",
      "hungerStrain": 1,
      "sanityCost": 5,
      "requirements": {
        "itemIds": [
          "laptop"
        ],
        "qualificationIds": [
          "business_degree"
        ],
        "familyExperienceDays": 4500
      },
      "available": true,
      "icon": "briefcase"
    },
    {
      "id": "nurse",
      "name": "Nurse",
      "careerId": "healthcare",
      "baseEarnings": "500",
      "maxEarnings": "500",
      "hungerStrain": 1,
      "sanityCost": 3,
      "requirements": {
        "itemIds": [],
        "qualificationIds": [
          "nursing_degree"
        ],
        "familyExperienceDays": 0
      },
      "available": true,
      "icon": "briefcase"
    },
    {
      "id": "senior_nurse",
      "name": "Senior nurse",
      "careerId": "healthcare",
      "baseEarnings": "900",
      "maxEarnings": "900",
      "hungerStrain": 1,
      "sanityCost": 4,
      "requirements": {
        "itemIds": [],
        "qualificationIds": [
          "nursing_degree"
        ],
        "familyExperienceDays": 1500
      },
      "available": true,
      "icon": "briefcase"
    },
    {
      "id": "junior_engineer",
      "name": "Junior engineer",
      "careerId": "engineering",
      "baseEarnings": "550",
      "maxEarnings": "550",
      "hungerStrain": 1,
      "sanityCost": 3,
      "requirements": {
        "itemIds": [
          "laptop"
        ],
        "qualificationIds": [
          "engineering_degree"
        ],
        "familyExperienceDays": 0
      },
      "available": true,
      "icon": "briefcase"
    },
    {
      "id": "project_engineer",
      "name": "Project engineer",
      "careerId": "engineering",
      "baseEarnings": "950",
      "maxEarnings": "950",
      "hungerStrain": 1,
      "sanityCost": 4,
      "requirements": {
        "itemIds": [
          "laptop"
        ],
        "qualificationIds": [
          "engineering_degree"
        ],
        "familyExperienceDays": 1500
      },
      "available": true,
      "icon": "briefcase"
    },
    {
      "id": "lead_engineer",
      "name": "Lead engineer",
      "careerId": "engineering",
      "baseEarnings": "1400",
      "maxEarnings": "1400",
      "hungerStrain": 1,
      "sanityCost": 4,
      "requirements": {
        "itemIds": [
          "laptop"
        ],
        "qualificationIds": [
          "engineering_degree"
        ],
        "familyExperienceDays": 4500
      },
      "available": true,
      "icon": "briefcase"
    },
    {
      "id": "designer",
      "name": "Designer",
      "careerId": "creative",
      "baseEarnings": "400",
      "maxEarnings": "400",
      "hungerStrain": 1,
      "sanityCost": 3,
      "requirements": {
        "itemIds": [
          "laptop"
        ],
        "qualificationIds": [
          "design_certificate"
        ],
        "familyExperienceDays": 0
      },
      "available": true,
      "icon": "briefcase"
    },
    {
      "id": "senior_designer",
      "name": "Senior designer",
      "careerId": "creative",
      "baseEarnings": "750",
      "maxEarnings": "750",
      "hungerStrain": 1,
      "sanityCost": 4,
      "requirements": {
        "itemIds": [
          "laptop"
        ],
        "qualificationIds": [
          "design_certificate"
        ],
        "familyExperienceDays": 1500
      },
      "available": true,
      "icon": "briefcase"
    },
    {
      "id": "art_director",
      "name": "Art director",
      "careerId": "creative",
      "baseEarnings": "1150",
      "maxEarnings": "1150",
      "hungerStrain": 1,
      "sanityCost": 4,
      "requirements": {
        "itemIds": [
          "laptop"
        ],
        "qualificationIds": [
          "design_certificate"
        ],
        "familyExperienceDays": 4500
      },
      "available": true,
      "icon": "briefcase"
    }
  ],
  "colleges": [
    {
      "id": "riverside",
      "name": "Riverside College",
      "qualificationIds": [
        "computing_degree",
        "business_degree",
        "nursing_degree",
        "engineering_degree",
        "design_certificate"
      ],
      "available": true,
      "icon": "school"
    },
    {
      "id": "oak_trade",
      "name": "Oak Trade Institute",
      "qualificationIds": [
        "trade_certificate"
      ],
      "available": true,
      "icon": "school"
    }
  ],
  "qualifications": [
    {
      "id": "trade_certificate",
      "name": "Trade certificate",
      "tuition": "25000",
      "studyDays": 120,
      "collegeIds": [
        "oak_trade"
      ],
      "available": true,
      "icon": "school"
    },
    {
      "id": "computing_degree",
      "name": "Computing degree",
      "tuition": "180000",
      "studyDays": 1460,
      "collegeIds": [
        "riverside"
      ],
      "available": true,
      "icon": "school"
    },
    {
      "id": "business_degree",
      "name": "Business degree",
      "tuition": "160000",
      "studyDays": 1460,
      "collegeIds": [
        "riverside"
      ],
      "available": true,
      "icon": "school"
    },
    {
      "id": "nursing_degree",
      "name": "Nursing degree",
      "tuition": "200000",
      "studyDays": 1460,
      "collegeIds": [
        "riverside"
      ],
      "available": true,
      "icon": "school"
    },
    {
      "id": "engineering_degree",
      "name": "Engineering degree",
      "tuition": "220000",
      "studyDays": 1460,
      "collegeIds": [
        "riverside"
      ],
      "available": true,
      "icon": "school"
    },
    {
      "id": "design_certificate",
      "name": "Design certificate",
      "tuition": "40000",
      "studyDays": 365,
      "collegeIds": [
        "riverside"
      ],
      "available": true,
      "icon": "school"
    }
  ],
  "items": [
    {
      "id": "bread",
      "name": "Bread",
      "price": "25",
      "category": "food",
      "effect": "food",
      "available": true,
      "icon": "bag",
      "requirements": {
        "itemIds": []
      },
      "hungerRestore": 25
    },
    {
      "id": "meal",
      "name": "Full meal",
      "price": "100",
      "category": "food",
      "effect": "food",
      "available": true,
      "icon": "bag",
      "requirements": {
        "itemIds": []
      },
      "hungerRestore": 80
    },
    {
      "id": "premium_meal",
      "name": "Premium meal",
      "price": "180",
      "category": "food",
      "effect": "food",
      "available": true,
      "icon": "bag",
      "requirements": {
        "itemIds": []
      },
      "hungerRestore": 100
    },
    {
      "id": "bike",
      "name": "Bike",
      "price": "2500",
      "category": "vehicles",
      "effect": "unlock",
      "available": true,
      "icon": "car",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "delivery_kit",
      "name": "Delivery kit",
      "price": "10000",
      "category": "equipment",
      "effect": "unlock",
      "available": true,
      "icon": "bag",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "trade_tools",
      "name": "Trade tools",
      "price": "15000",
      "category": "equipment",
      "effect": "unlock",
      "available": true,
      "icon": "bag",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "laptop",
      "name": "Laptop",
      "price": "45000",
      "category": "technology",
      "effect": "unlock",
      "available": true,
      "icon": "bag",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "room",
      "name": "Room",
      "price": "12000",
      "category": "housing",
      "effect": "cosmetic",
      "available": true,
      "icon": "home",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "studio",
      "name": "Studio",
      "price": "60000",
      "category": "housing",
      "effect": "cosmetic",
      "available": true,
      "icon": "home",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "apartment",
      "name": "Apartment",
      "price": "200000",
      "category": "housing",
      "effect": "cosmetic",
      "available": true,
      "icon": "home",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "small_house",
      "name": "Small House",
      "price": "600000",
      "category": "housing",
      "effect": "cosmetic",
      "available": true,
      "icon": "home",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "townhouse",
      "name": "Townhouse",
      "price": "1500000",
      "category": "housing",
      "effect": "cosmetic",
      "available": true,
      "icon": "home",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "villa",
      "name": "Villa",
      "price": "4000000",
      "category": "housing",
      "effect": "cosmetic",
      "available": true,
      "icon": "home",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "penthouse",
      "name": "Penthouse",
      "price": "7000000",
      "category": "housing",
      "effect": "cosmetic",
      "available": true,
      "icon": "home",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "estate",
      "name": "Estate",
      "price": "12000000",
      "category": "housing",
      "effect": "cosmetic",
      "available": true,
      "icon": "home",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "scooter",
      "name": "Scooter",
      "price": "18000",
      "category": "vehicles",
      "effect": "cosmetic",
      "available": true,
      "icon": "car",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "used_car",
      "name": "Used Car",
      "price": "60000",
      "category": "vehicles",
      "effect": "cosmetic",
      "available": true,
      "icon": "car",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "sedan",
      "name": "Sedan",
      "price": "180000",
      "category": "vehicles",
      "effect": "cosmetic",
      "available": true,
      "icon": "car",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "suv",
      "name": "Suv",
      "price": "350000",
      "category": "vehicles",
      "effect": "cosmetic",
      "available": true,
      "icon": "car",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "sports_car",
      "name": "Sports Car",
      "price": "700000",
      "category": "vehicles",
      "effect": "cosmetic",
      "available": true,
      "icon": "car",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "luxury_car",
      "name": "Luxury Car",
      "price": "1200000",
      "category": "vehicles",
      "effect": "cosmetic",
      "available": true,
      "icon": "car",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "supercar",
      "name": "Supercar",
      "price": "2500000",
      "category": "vehicles",
      "effect": "cosmetic",
      "available": true,
      "icon": "car",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "starter_motorcycle",
      "name": "Starter Motorcycle",
      "price": "25000",
      "category": "motorcycles",
      "effect": "cosmetic",
      "available": true,
      "icon": "bag",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "touring_motorcycle",
      "name": "Touring Motorcycle",
      "price": "100000",
      "category": "motorcycles",
      "effect": "cosmetic",
      "available": true,
      "icon": "bag",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "premium_motorcycle",
      "name": "Premium Motorcycle",
      "price": "300000",
      "category": "motorcycles",
      "effect": "cosmetic",
      "available": true,
      "icon": "bag",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "smartphone",
      "name": "Smartphone",
      "price": "8000",
      "category": "technology",
      "effect": "cosmetic",
      "available": true,
      "icon": "bag",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "tablet",
      "name": "Tablet",
      "price": "15000",
      "category": "technology",
      "effect": "cosmetic",
      "available": true,
      "icon": "bag",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "gaming_pc",
      "name": "Gaming Pc",
      "price": "80000",
      "category": "technology",
      "effect": "cosmetic",
      "available": true,
      "icon": "bag",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "workstation",
      "name": "Workstation",
      "price": "150000",
      "category": "technology",
      "effect": "cosmetic",
      "available": true,
      "icon": "bag",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "home_cinema",
      "name": "Home Cinema",
      "price": "250000",
      "category": "technology",
      "effect": "cosmetic",
      "available": true,
      "icon": "bag",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "everyday_watch",
      "name": "Everyday Watch",
      "price": "5000",
      "category": "jewelry",
      "effect": "cosmetic",
      "available": true,
      "icon": "bag",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "mechanical_watch",
      "name": "Mechanical Watch",
      "price": "40000",
      "category": "jewelry",
      "effect": "cosmetic",
      "available": true,
      "icon": "bag",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "necklace",
      "name": "Necklace",
      "price": "60000",
      "category": "jewelry",
      "effect": "cosmetic",
      "available": true,
      "icon": "bag",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "ring",
      "name": "Ring",
      "price": "100000",
      "category": "jewelry",
      "effect": "cosmetic",
      "available": true,
      "icon": "bag",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "luxury_watch",
      "name": "Luxury Watch",
      "price": "400000",
      "category": "jewelry",
      "effect": "cosmetic",
      "available": true,
      "icon": "bag",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "casual_outfit",
      "name": "Casual Outfit",
      "price": "2000",
      "category": "fashion",
      "effect": "cosmetic",
      "available": true,
      "icon": "bag",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "tailored_suit",
      "name": "Tailored Suit",
      "price": "20000",
      "category": "fashion",
      "effect": "cosmetic",
      "available": true,
      "icon": "bag",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "designer_outfit",
      "name": "Designer Outfit",
      "price": "100000",
      "category": "fashion",
      "effect": "cosmetic",
      "available": true,
      "icon": "bag",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "bed",
      "name": "Bed",
      "price": "15000",
      "category": "furnishings",
      "effect": "cosmetic",
      "available": true,
      "icon": "bag",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "desk",
      "name": "Desk",
      "price": "20000",
      "category": "furnishings",
      "effect": "cosmetic",
      "available": true,
      "icon": "bag",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "sofa",
      "name": "Sofa",
      "price": "35000",
      "category": "furnishings",
      "effect": "cosmetic",
      "available": true,
      "icon": "bag",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "artwork",
      "name": "Artwork",
      "price": "120000",
      "category": "furnishings",
      "effect": "cosmetic",
      "available": true,
      "icon": "bag",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "music_room",
      "name": "Music Room",
      "price": "300000",
      "category": "furnishings",
      "effect": "cosmetic",
      "available": true,
      "icon": "bag",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "sports_kit",
      "name": "Sports Kit",
      "price": "5000",
      "category": "hobbies",
      "effect": "cosmetic",
      "available": true,
      "icon": "bag",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "guitar",
      "name": "Guitar",
      "price": "12000",
      "category": "hobbies",
      "effect": "cosmetic",
      "available": true,
      "icon": "bag",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "camera",
      "name": "Camera",
      "price": "30000",
      "category": "hobbies",
      "effect": "cosmetic",
      "available": true,
      "icon": "bag",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "piano",
      "name": "Piano",
      "price": "100000",
      "category": "hobbies",
      "effect": "cosmetic",
      "available": true,
      "icon": "bag",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "weekend_trip",
      "name": "Weekend Trip",
      "price": "10000",
      "category": "travel",
      "effect": "travel",
      "available": true,
      "icon": "bag",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "retreat",
      "name": "Retreat",
      "price": "40000",
      "category": "travel",
      "effect": "travel",
      "available": true,
      "icon": "bag",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "island_holiday",
      "name": "Island Holiday",
      "price": "150000",
      "category": "travel",
      "effect": "travel",
      "available": true,
      "icon": "bag",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "world_tour",
      "name": "World Tour",
      "price": "500000",
      "category": "travel",
      "effect": "travel",
      "available": true,
      "icon": "bag",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "rare_books",
      "name": "Rare Books",
      "price": "50000",
      "category": "collections",
      "effect": "cosmetic",
      "available": true,
      "icon": "bag",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "vintage_car",
      "name": "Vintage Car",
      "price": "900000",
      "category": "collections",
      "effect": "cosmetic",
      "available": true,
      "icon": "bag",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "rare_artwork",
      "name": "Rare Artwork",
      "price": "1000000",
      "category": "collections",
      "effect": "cosmetic",
      "available": true,
      "icon": "bag",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "pool",
      "name": "Pool",
      "price": "500000",
      "category": "luxury",
      "effect": "cosmetic",
      "available": true,
      "icon": "bag",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "holiday_home",
      "name": "Holiday Home",
      "price": "3000000",
      "category": "luxury",
      "effect": "cosmetic",
      "available": true,
      "icon": "bag",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "yacht",
      "name": "Yacht",
      "price": "8000000",
      "category": "luxury",
      "effect": "cosmetic",
      "available": true,
      "icon": "bag",
      "requirements": {
        "itemIds": []
      }
    },
    {
      "id": "private_jet",
      "name": "Private Jet",
      "price": "15000000",
      "category": "luxury",
      "effect": "cosmetic",
      "available": true,
      "icon": "bag",
      "requirements": {
        "itemIds": []
      }
    }
  ],
  "goals": [
    {
      "id": "buy_bike",
      "name": "Save for a bike",
      "kind": "own_item",
      "targetId": "bike",
      "targetAmount": "1",
      "available": true,
      "icon": "flag"
    },
    {
      "id": "buy_small_house",
      "name": "Save for a home",
      "kind": "own_item",
      "targetId": "small_house",
      "targetAmount": "1",
      "available": true,
      "icon": "flag"
    },
    {
      "id": "buy_villa",
      "name": "Save for a villa",
      "kind": "own_item",
      "targetId": "villa",
      "targetAmount": "1",
      "available": true,
      "icon": "flag"
    },
    {
      "id": "buy_private_jet",
      "name": "Save for a private jet",
      "kind": "own_item",
      "targetId": "private_jet",
      "targetAmount": "1",
      "available": true,
      "icon": "flag"
    },
    {
      "id": "graduate_computing_degree",
      "name": "Graduate in Computing",
      "kind": "qualification",
      "targetId": "computing_degree",
      "targetAmount": "1",
      "available": true,
      "icon": "school"
    },
    {
      "id": "graduate_trade_certificate",
      "name": "Qualify in Trades",
      "kind": "qualification",
      "targetId": "trade_certificate",
      "targetAmount": "1",
      "available": true,
      "icon": "school"
    }
  ],
  "ambitions": [
    {
      "id": "career",
      "name": "Build a career",
      "kind": "career",
      "targetId": "senior_engineer",
      "available": true,
      "icon": "flag"
    },
    {
      "id": "homeowner",
      "name": "Become a homeowner",
      "kind": "homeowner",
      "targetId": "small_house",
      "available": true,
      "icon": "flag"
    },
    {
      "id": "garage",
      "name": "Build a garage",
      "kind": "garage",
      "targetId": "vehicles",
      "available": true,
      "icon": "flag"
    },
    {
      "id": "lifetime",
      "name": "Complete a lifetime",
      "kind": "age_limit",
      "targetId": "",
      "available": true,
      "icon": "flag"
    }
  ],
  "opportunities": [
    {
      "id": "work_contract",
      "name": "Career assignment",
      "kind": "work_contract",
      "firstDay": 180,
      "intervalDays": 365,
      "requiredWorkDays": 10,
      "durationDays": 60,
      "bonusDivisor": 10,
      "lifeBonusCap": "100000",
      "available": true,
      "icon": "briefcase"
    }
  ],
  "economy": {
    "startAge": 18,
    "endAge": 100,
    "daysPerYear": 365,
    "startingHunger": 100,
    "startingSanity": 100,
    "startingHealth": 10000,
    "starterJobId": "begging",
    "ageBands": [
      {
        "startAge": 18,
        "basalHunger": 4,
        "healthLoss": 0
      },
      {
        "startAge": 40,
        "basalHunger": 5,
        "healthLoss": 5
      },
      {
        "startAge": 60,
        "basalHunger": 6,
        "healthLoss": 15
      },
      {
        "startAge": 75,
        "basalHunger": 7,
        "healthLoss": 30
      },
      {
        "startAge": 90,
        "basalHunger": 8,
        "healthLoss": 50
      }
    ],
    "restSanity": 25,
    "restHealth": 400,
    "checkupHealth": 3000,
    "checkupPrice": "250",
    "studyStrain": 1,
    "studySanity": 2,
    "bankUnlockEarned": "10000",
    "bankMinimumDeposit": "100",
    "bankTier": "500000",
    "bankNumeratorBase": 4,
    "bankNumeratorExcess": 1,
    "bankAnnualNumeratorCap": "20000000",
    "bankDenominator": 146000,
    "workWeekUnlockDays": 200,
    "maximumWeekDays": 7,
    "dailyRate": 4,
    "dailyBurst": 8,
    "maximumOfflineDays": 1200
  }
};
