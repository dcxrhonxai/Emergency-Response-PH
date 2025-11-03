# Philippine Emergency Services API Integration Guide

## 🇵🇭 Available Philippine Emergency Services APIs

### 1. **Philippine National Emergency Hotline (911)**
- **Service**: Centralized emergency response
- **Direct Dial**: `911` (works nationwide)
- **Integration**: Use `tel:911` for direct calling
- **Coverage**: Nationwide

### 2. **NDRRMC (National Disaster Risk Reduction and Management Council)**
- **Phone**: (02) 8911-1406
- **Website**: http://www.ndrrmc.gov.ph
- **Services**: Natural disaster response, coordination
- **API**: No public API available (manual integration required)

### 3. **Philippine National Police (PNP)**
- **Hotline**: `117` or (02) 8722-0650
- **Services**: Crime reporting, police assistance
- **Integration**: Direct calling via `tel:117`

### 4. **Philippine Red Cross**
- **Hotline**: `143` or (02) 8790-2300
- **Website**: https://redcross.org.ph
- **Services**: Medical emergency, ambulance, disaster relief
- **API**: No public API, but SMS integration possible

## 📍 Location-Based Services Integration

### Google Maps Platform APIs (Recommended)
Already integrated in the app for:
- **Directions API**: Route planning to emergency services
- **Places API**: Finding nearby hospitals, police stations, fire departments
- **Geocoding API**: Converting addresses to coordinates

### Waze Emergency Integration
- **Waze for Cities**: Traffic and incident data
- **URL Scheme**: `waze://?ll=<lat>,<lng>&navigate=yes`

## 🏥 Healthcare Facility APIs

### DOH Health Facilities Enhancement Program (HFEP)
- **Data Portal**: https://data.gov.ph
- **Contains**: Hospital locations, contact information
- **Format**: CSV/JSON downloads
- **Update Frequency**: Quarterly

### PhilHealth Accredited Facilities
- **Website**: https://www.philhealth.gov.ph
- **Contains**: Accredited hospitals and clinics
- **Integration**: Manual data import (no real-time API)

## 🚨 Recommended Implementation

### Priority 1: Direct Integration (Already Implemented)
✅ Direct phone calling (`tel:` links)
✅ Google Maps directions
✅ Location tracking with high accuracy
✅ Real-time distance calculation

### Priority 2: Database Population
Populate the `emergency_services` table with:
1. Major hospitals in Metro Manila
2. Police stations per city
3. Fire stations per district
4. Red Cross chapters

### Priority 3: Third-Party Services

#### A. **Twilio SMS API** (for notifications)
- Already used via Semaphore API
- Can add fallback SMS gateway

#### B. **OneMap Philippines**
- https://www.onemap.ph
- Government mapping service
- Contains emergency service locations

#### C. **OpenStreetMap (OSM) Overpass API**
```javascript
// Example query for hospitals in Manila
const query = `
  [out:json];
  node["amenity"="hospital"]
    (14.4000,120.9000,14.7000,121.1000);
  out;
`;
```

## 🔄 Data Sources for Emergency Services

### Government Open Data
1. **data.gov.ph** - Official government data portal
2. **PAGASA** - Weather and disaster warnings
3. **DOH** - Health facility registry
4. **MMDA** - Metro Manila traffic and emergency

### Commercial Services
1. **Google Places API** - Real-time facility info
2. **HERE Maps** - Traffic and routing
3. **TomTom** - Live traffic data

## 📝 Implementation Steps

### Step 1: Seed Database
```sql
-- Example: Insert major hospitals
INSERT INTO emergency_services (name, type, phone, address, city, latitude, longitude, is_national)
VALUES 
  ('Philippine General Hospital', 'Hospital', '(02) 8554-8400', 'Taft Avenue', 'Manila', 14.5787, 120.9860, false),
  ('Makati Medical Center', 'Hospital', '(02) 8888-8999', 'Amorsolo St', 'Makati', 14.5636, 121.0173, false);
```

### Step 2: Regular Updates
- Quarterly data refresh from DOH
- Real-time status from facility APIs (if available)
- Community-sourced updates

### Step 3: Offline Fallback
- Cache essential emergency numbers
- Store last known facility locations
- Offline maps support

## ⚠️ Limitations

### Current Challenges
1. **No Unified API**: Philippines lacks a centralized emergency services API
2. **Data Fragmentation**: Information spread across multiple agencies
3. **Update Delays**: Manual data collection required
4. **Limited Real-time Data**: Most services don't provide live status

### Workarounds Implemented
✅ Manual database seeding
✅ Google Maps integration
✅ Direct phone calling
✅ SMS notifications via Semaphore

## 🚀 Future Enhancements

1. **Implement OSM Integration**: Auto-update facilities from OpenStreetMap
2. **Add PAGASA Weather API**: Disaster warnings integration
3. **Traffic Integration**: MMDA traffic API for route optimization
4. **Community Reporting**: User-submitted facility updates
5. **Verified Status**: Real-time facility availability (when APIs become available)

## 📞 Contact Information for Data Requests

- **NDRRMC**: ndrrmc@ndrrmc.gov.ph
- **DOH**: osec@doh.gov.ph  
- **PNP**: info@pnp.gov.ph
- **Red Cross**: info@redcross.org.ph

---

**Note**: This app currently uses the best available integration methods. As Philippine government agencies develop public APIs, we can enhance real-time capabilities.
