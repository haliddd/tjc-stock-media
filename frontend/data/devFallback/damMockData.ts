export type DamAssetStatus = "Approved" | "Needs Review" | "Restricted" | "Missing Consent" | "Expiring Soon";

export type DamAsset = {
  id: string;
  title: string;
  filename: string;
  type: "JPG" | "MP4" | "PDF" | "PNG" | "PPTX" | "INDD";
  mime: string;
  dimensions: string;
  size: string;
  thumbnail: string;
  status: DamAssetStatus;
  createdBy: string;
  uploadedBy: string;
  createdAt: string;
  uploadedAt: string;
  categories: string[];
  keywords: string[];
  usageRights: string;
  licenseType: string;
  territory: string;
  duration: string;
  modelRelease: string;
  propertyRelease: string;
  versions: Array<{ label: string; date: string; size: string; current?: boolean }>;
  activity: string[];
  usageChannels: string[];
  collectionMembership: string[];
};

export const damAssets: DamAsset[] = [
  {
    id: "368",
    title: "Worship retreat mountain sunrise",
    filename: "TJC_2024_MountainLake_0123.jpg",
    type: "JPG",
    mime: "image/jpeg",
    dimensions: "6000 x 4000 (3:2)",
    size: "9.8 MB",
    thumbnail: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=85",
    status: "Approved",
    createdBy: "Alex Kim",
    uploadedBy: "Alex Kim",
    createdAt: "May 21, 2024",
    uploadedAt: "May 21, 2024, 7:15 AM",
    categories: ["Nature", "Landscape", "Travel"],
    keywords: ["mountains", "lake", "sunrise", "reflection", "pine trees", "wilderness", "canada"],
    usageRights: "Commercial & Editorial",
    licenseType: "Royalty-Free",
    territory: "Worldwide",
    duration: "Perpetual",
    modelRelease: "No",
    propertyRelease: "Yes",
    versions: [
      { label: "v3", date: "May 21, 2024, 7:15 AM", size: "9.8 MB", current: true },
      { label: "v2", date: "May 20, 2024, 3:11 PM", size: "4.2 MB" },
      { label: "v1", date: "May 19, 2024, 11:07 AM", size: "1.1 MB" }
    ],
    activity: ["Approved by Maria Santos", "Added to worship media review set", "Downloaded by Jamie Lee"],
    usageChannels: ["Website", "Email", "Social Media", "Print"],
    collectionMembership: ["Mountain Collection", "Worship Media Toolkit"]
  },
  {
    id: "1556",
    title: "Coastal fellowship retreat shoreline",
    filename: "TJC_2024_Coast_0045.mp4",
    type: "MP4",
    mime: "video/mp4",
    dimensions: "5000 x 3333",
    size: "7.2 MB",
    thumbnail: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=85",
    status: "Approved",
    createdBy: "Taylor Nguyen",
    uploadedBy: "Alex Kim",
    createdAt: "May 21, 2024",
    uploadedAt: "May 21, 2024, 6:42 AM",
    categories: ["Nature", "Travel"],
    keywords: ["coast", "turquoise", "ocean", "cliffs"],
    usageRights: "Commercial & Editorial",
    licenseType: "Royalty-Free",
    territory: "Worldwide",
    duration: "Perpetual",
    modelRelease: "No",
    propertyRelease: "Yes",
    versions: [{ label: "v1", date: "May 21, 2024", size: "7.2 MB", current: true }],
    activity: ["Approved by Maria Santos", "Added to Hero Assets"],
    usageChannels: ["Website", "Social Media"],
    collectionMembership: ["Worship Media Toolkit"]
  },
  {
    id: "777",
    title: "City skyline at golden hour",
    filename: "TJC_2024_CitySkyline_0777.jpg",
    type: "JPG",
    mime: "image/jpeg",
    dimensions: "6000 x 3375",
    size: "24.1 MB",
    thumbnail: "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=85",
    status: "Approved",
    createdBy: "Alex Kim",
    uploadedBy: "Alex Kim",
    createdAt: "May 20, 2024",
    uploadedAt: "May 20, 2024",
    categories: ["Business", "City"],
    keywords: ["city", "skyline", "golden hour"],
    usageRights: "Commercial & Editorial",
    licenseType: "Royalty-Free",
    territory: "Worldwide",
    duration: "Perpetual",
    modelRelease: "No",
    propertyRelease: "Yes",
    versions: [{ label: "v1", date: "May 20, 2024", size: "24.1 MB", current: true }],
    activity: ["Approved by Maria Santos"],
    usageChannels: ["Website", "Print"],
    collectionMembership: ["Q2 Campaign Assets"]
  },
  {
    id: "644",
    title: "Forest trail with sunlight",
    filename: "TJC_2024_Forest_0312.mp4",
    type: "MP4",
    mime: "video/mp4",
    dimensions: "5472 x 3648",
    size: "6.1 MB",
    thumbnail: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=85",
    status: "Needs Review",
    createdBy: "Priya Nair",
    uploadedBy: "Priya Nair",
    createdAt: "May 20, 2024",
    uploadedAt: "May 20, 2024",
    categories: ["Nature"],
    keywords: ["forest", "trail", "sunlight"],
    usageRights: "Review required",
    licenseType: "Pending",
    territory: "TBD",
    duration: "TBD",
    modelRelease: "Not Required",
    propertyRelease: "Pending",
    versions: [{ label: "v1", date: "May 20, 2024", size: "6.1 MB", current: true }],
    activity: ["Submitted for review"],
    usageChannels: ["Website"],
    collectionMembership: ["Hero Assets"]
  },
  {
    id: "921",
    title: "Surfer riding ocean wave",
    filename: "TJC_2024_Surfer_0921.mp4",
    type: "MP4",
    mime: "video/mp4",
    dimensions: "3840 x 2160",
    size: "18.7 MB",
    thumbnail: "https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=1200&q=85",
    status: "Approved",
    createdBy: "Jordan Lee",
    uploadedBy: "Jordan Lee",
    createdAt: "May 20, 2024",
    uploadedAt: "May 20, 2024",
    categories: ["Lifestyle", "Travel"],
    keywords: ["surf", "wave", "ocean"],
    usageRights: "Commercial & Editorial",
    licenseType: "Royalty-Free",
    territory: "Worldwide",
    duration: "Perpetual",
    modelRelease: "Yes",
    propertyRelease: "No",
    versions: [{ label: "v1", date: "May 20, 2024", size: "18.7 MB", current: true }],
    activity: ["Approved by Maria Santos"],
    usageChannels: ["Social Media", "Website"],
    collectionMembership: ["Social Media"]
  },
  {
    id: "834",
    title: "Desert canyon landscape",
    filename: "TJC_2024_Desert_0834.jpg",
    type: "JPG",
    mime: "image/jpeg",
    dimensions: "6000 x 4000",
    size: "8.3 MB",
    thumbnail: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=85",
    status: "Restricted",
    createdBy: "Alex Kim",
    uploadedBy: "Alex Kim",
    createdAt: "May 20, 2024",
    uploadedAt: "May 20, 2024",
    categories: ["Nature", "Travel"],
    keywords: ["desert", "canyon", "landscape"],
    usageRights: "Restricted",
    licenseType: "Editorial",
    territory: "North America",
    duration: "One year",
    modelRelease: "No",
    propertyRelease: "No",
    versions: [{ label: "v1", date: "May 20, 2024", size: "8.3 MB", current: true }],
    activity: ["Restricted by reviewer"],
    usageChannels: ["Internal"],
    collectionMembership: ["Hero Assets"]
  },
  {
    id: "912",
    title: "Woman explorer portrait",
    filename: "TJC_2024_Explorer_0912.jpg",
    type: "JPG",
    mime: "image/jpeg",
    dimensions: "4000 x 5000",
    size: "5.4 MB",
    thumbnail: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=85",
    status: "Approved",
    createdBy: "Jamie Lee",
    uploadedBy: "Jamie Lee",
    createdAt: "May 19, 2024",
    uploadedAt: "May 19, 2024",
    categories: ["Lifestyle", "People"],
    keywords: ["portrait", "explorer", "outdoor"],
    usageRights: "Commercial & Editorial",
    licenseType: "Royalty-Free",
    territory: "Worldwide",
    duration: "Perpetual",
    modelRelease: "Yes",
    propertyRelease: "No",
    versions: [{ label: "v1", date: "May 19, 2024", size: "5.4 MB", current: true }],
    activity: ["Approved by Maria Santos"],
    usageChannels: ["Social Media", "Email"],
    collectionMembership: ["Social Media"]
  },
  {
    id: "451",
    title: "Skincare product on stone",
    filename: "TJC_2024_ProductStill_0451.jpg",
    type: "JPG",
    mime: "image/jpeg",
    dimensions: "3000 x 3000",
    size: "3.2 MB",
    thumbnail: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=1200&q=85",
    status: "Approved",
    createdBy: "Taylor Nguyen",
    uploadedBy: "Taylor Nguyen",
    createdAt: "May 19, 2024",
    uploadedAt: "May 19, 2024",
    categories: ["Product"],
    keywords: ["product", "still", "stone"],
    usageRights: "Commercial & Editorial",
    licenseType: "TJC-owned",
    territory: "Worldwide",
    duration: "Perpetual",
    modelRelease: "Not Required",
    propertyRelease: "Yes",
    versions: [{ label: "v1", date: "May 19, 2024", size: "3.2 MB", current: true }],
    activity: ["Approved by Maria Santos"],
    usageChannels: ["Website", "Email"],
    collectionMembership: ["Product"]
  },
  {
    id: "pdf-24",
    title: "TJC Brand Guidelines v2.4",
    filename: "TJC_Brand_Guidelines_v2.4.pdf",
    type: "PDF",
    mime: "application/pdf",
    dimensions: "PDF",
    size: "4.7 MB",
    thumbnail: "",
    status: "Approved",
    createdBy: "Brand Team",
    uploadedBy: "Brand Team",
    createdAt: "May 19, 2024",
    uploadedAt: "May 19, 2024",
    categories: ["Brand"],
    keywords: ["brand", "guidelines", "logo"],
    usageRights: "Internal distribution",
    licenseType: "TJC-owned",
    territory: "Global",
    duration: "Current",
    modelRelease: "Not Required",
    propertyRelease: "Not Required",
    versions: [{ label: "v2.4", date: "May 19, 2024", size: "4.7 MB", current: true }],
    activity: ["Published by Brand Team"],
    usageChannels: ["Internal", "Print"],
    collectionMembership: ["Brand Hub"]
  }
];

const extraImages = [
  ["2012", "Palm leaves close-up", "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=900&q=80"],
  ["2013", "Church fellowship table", "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=80"],
  ["2014", "Open Bible study notes", "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=900&q=80"],
  ["2015", "Warm chapel interior", "https://images.unsplash.com/photo-1438032005730-c779502df39b?auto=format&fit=crop&w=900&q=80"],
  ["2016", "Mountain cabin retreat", "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=80"],
  ["2017", "Ocean waves vertical", "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=900&q=80"],
  ["2018", "Office team workshop", "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?auto=format&fit=crop&w=900&q=80"],
  ["2019", "Flower detail", "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=900&q=80"],
  ["2020", "Conference welcome desk", "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=900&q=80"],
  ["2021", "Printed flyers stack", "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=900&q=80"],
  ["2022", "Quiet reading room", "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=900&q=80"],
  ["2023", "Youth camp field", "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=80"]
] as const;

export const damAssetGrid = [
  ...damAssets,
  ...extraImages.map(([id, title, thumbnail], index) => ({
    ...damAssets[index % 6],
    id,
    title,
    filename: `TJC_2024_${title.replaceAll(" ", "")}_${id}.jpg`,
    thumbnail,
    type: index % 5 === 0 ? "MP4" as const : "JPG" as const,
    status: index % 7 === 0 ? "Expiring Soon" as DamAssetStatus : index % 6 === 0 ? "Missing Consent" as DamAssetStatus : "Approved" as DamAssetStatus,
    size: `${(2.8 + index * 0.7).toFixed(1)} MB`
  }))
];

export const packageSections = [
  { name: "Cover", count: 1, image: damAssets[0].thumbnail },
  { name: "01. Hero Assets", count: 5, image: damAssets[1].thumbnail },
  { name: "02. Social Media", count: 8, image: damAssets[6].thumbnail },
  { name: "03. Product", count: 6, image: damAssets[7].thumbnail },
  { name: "04. Lifestyle", count: 4, image: damAssetGrid[10].thumbnail },
  { name: "05. Documents", count: 3, image: "" }
];

export const adminRoles = [
  ["System Administrator", "6", "Full system access", "May 19, 2024"],
  ["Content Manager", "24", "Content management", "May 18, 2024"],
  ["Brand Manager", "12", "Brand assets & guidelines", "May 17, 2024"],
  ["Reviewer", "38", "Review & approve", "May 16, 2024"],
  ["Contributor", "96", "Upload & submit", "May 16, 2024"],
  ["Viewer", "80", "View only", "May 15, 2024"]
];

export const auditRows = [
  ["May 21, 10:42 AM", "Sarah Chen", "Policy updated", "Rights Policy: External Use", "Changed usage restrictions"],
  ["May 21, 9:18 AM", "Michael Torres", "Role assigned", "Brand Manager", "Assigned to 2 users"],
  ["May 21, 8:05 AM", "Alex Kim", "Workflow updated", "Creative Approval Flow", "Added notification step"],
  ["May 20, 4:33 PM", "Priya Nair", "User created", "Contributor", "New user invite"],
  ["May 20, 2:12 PM", "System", "Retention executed", "Old Assets Cleanup", "1,248 assets archived"]
];
