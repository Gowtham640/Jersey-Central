Perfect — thanks for clarifying 👍.
I’ll take the full `docs.md` you just shared and **update it to include the Cart + Orders system**, keeping the same style and structure you’ve already written.

Here’s the **fully updated `docs.md`:**

---

# 📄 Jersey Marketplace Project Documentation

## **Overview**

This project is a **Jersey Marketplace** built with **Next.js**, **Supabase**, and **TailwindCSS**.
It allows football jersey sellers to register, upload products with images and stock data, and enables admins to approve/reject seller requests.
It also supports buyers with cart & order flows.

Key features implemented:

- **Seller approval flow** – new seller requests can be approved/rejected by an admin.
- **Jersey catalog** – sellers can add jerseys with multiple images and size-based stock quantities.
- **Image handling** – supports single or multiple product images with Supabase Storage.
- **Admin dashboard** – track pending requests, approved/rejected sellers, total products, stock status, and homepage modules.
- **Homepage sections management** – admin can create, edit, delete, reorder, and populate sections like _Best Deals_, _New Arrivals_ dynamically.
- **Frontend product page** – includes image carousel, size selection from `jersey_stock`, stock-aware quantity input, and customer reviews.
- **Cart & Orders system** – buyers can add jerseys to cart, checkout, and create orders.

---

## **Database Schema**

### **Table:** `jerseys`

| Column Name  | Type                       | Constraints / Default               | Description                                                               |
| ------------ | -------------------------- | ----------------------------------- | ------------------------------------------------------------------------- |
| `id`         | `uuid`                     | **PK**, `DEFAULT gen_random_uuid()` | Primary key. Unique ID for each jersey.                                   |
| `created_at` | `timestamp with time zone` | `DEFAULT now()`                     | Timestamp of jersey creation.                                             |
| `title`      | `text`                     | `NOT NULL`                          | Name/title of the jersey.                                                 |
| `price`      | `numeric`                  | `NOT NULL`                          | Price of the jersey.                                                      |
| `image_url`  | `text`                     | `NOT NULL`                          | Supabase storage URL(s) of jersey images. JSON array string for multiple. |
| `club`       | `text`                     | `NOT NULL`                          | Football club name.                                                       |
| `season`     | `text`                     | `NOT NULL`                          | Season the jersey belongs to.                                             |
| `seller_id`  | `uuid`                     | **FK → auth.users.id**, `NOT NULL`  | Seller who uploaded the jersey.                                           |

---

### **Table:** `jersey_stock`

| Column Name  | Type                       | Constraints / Default               | Description                        |
| ------------ | -------------------------- | ----------------------------------- | ---------------------------------- |
| `id`         | `uuid`                     | **PK**, `DEFAULT gen_random_uuid()` | Unique ID for each stock entry.    |
| `jersey_id`  | `uuid`                     | **FK → jerseys.id**, `NOT NULL`     | Linked jersey ID.                  |
| `size`       | `text`                     | `NOT NULL`                          | Jersey size (e.g., S, M, L, XL).   |
| `stock`      | `integer`                  | `NOT NULL`, `DEFAULT 0`             | Available quantity for that size.  |
| `created_at` | `timestamp with time zone` | `DEFAULT now()`                     | Timestamp of stock entry creation. |

---

### **Table:** `seller_requests`

Stores pending seller requests.

| Column Name       | Type                       | Constraints / Default               | Description                            |
| ----------------- | -------------------------- | ----------------------------------- | -------------------------------------- |
| `id`              | `uuid`                     | **PK**, `DEFAULT gen_random_uuid()` | Unique ID for each request.            |
| `full_name`       | `text`                     | `NOT NULL`                          | Seller full name.                      |
| `email`           | `text`                     | `NOT NULL`                          | Seller email.                          |
| `phone_number`    | `text`                     | `NULL`                              | Seller phone number.                   |
| `approval_status` | `text`                     | `DEFAULT 'pending'`                 | 'pending', 'approved', or 'rejected'.  |
| `productsCount`   | `integer`                  | `DEFAULT 0`                         | Number of products uploaded by seller. |
| `created_at`      | `timestamp with time zone` | `DEFAULT now()`                     | Timestamp of request creation.         |

---

### **Table:** `homepage_sections`

| Column Name   | Type                       | Constraints / Default               | Description                                 |
| ------------- | -------------------------- | ----------------------------------- | ------------------------------------------- |
| `id`          | `uuid`                     | **PK**, `DEFAULT gen_random_uuid()` | Unique ID for each section.                 |
| `name`        | `text`                     | `NOT NULL`                          | Section name (e.g., "Best Deals").          |
| `order_index` | `integer`                  | `NOT NULL`                          | Display order on homepage. Lower = earlier. |
| `visible`     | `boolean`                  | `DEFAULT true`                      | Section visibility.                         |
| `created_at`  | `timestamp with time zone` | `DEFAULT now()`                     | Timestamp of creation.                      |

---

### **Table:** `homepage_products`

| Column Name   | Type                        | Constraints / Default               | Description                            |
| ------------- | --------------------------- | ----------------------------------- | -------------------------------------- |
| `id`          | `uuid`                      | **PK**, `DEFAULT gen_random_uuid()` | Unique record ID.                      |
| `section_id`  | `uuid`                      | **FK → homepage_sections.id**       | Linked homepage section.               |
| `jersey_id`   | `uuid`                      | **FK → jerseys.id**                 | Jersey linked to section.              |
| `order_index` | `integer`                   | `NOT NULL`                          | Display order in section.              |
| `created_at`  | `timestamp with time zone`  | `DEFAULT now()`                     | Timestamp of record creation.          |
| **Unique**    | (`section_id`, `jersey_id`) |                                     | Prevent duplicate jersey in a section. |

---

### **Table:** `cart_items`

| Column Name  | Type                       | Constraints / Default               | Description                    |
| ------------ | -------------------------- | ----------------------------------- | ------------------------------ |
| `id`         | `uuid`                     | **PK**, `DEFAULT gen_random_uuid()` | Unique ID for each cart item.  |
| `user_id`    | `uuid`                     | **FK → users.id**, `NOT NULL`       | The buyer who added this item. |
| `jersey_id`  | `uuid`                     | **FK → jerseys.id**, `NOT NULL`     | Jersey being added.            |
| `size`       | `text`                     | `NOT NULL`                          | Size selected by user.         |
| `quantity`   | `integer`                  | `NOT NULL`, `DEFAULT 1`             | Quantity (must be > 0).        |
| `created_at` | `timestamp with time zone` | `DEFAULT now()`                     | When item was added.           |
| `updated_at` | `timestamp with time zone` | `DEFAULT now()`                     | Last updated time.             |

🔑 **Constraint**: unique (`user_id`, `jersey_id`, `size`) → prevents duplicates.

---

---

## **Data Flow**

### **Cart → Order Flow**

1. User adds item → `cart_items`.
2. At checkout:

   - Create row in `orders`.
   - Move each `cart_items` → `order_items` (with price snapshot).
   - Empty user’s `cart_items`.

3. Admin/seller can later update order `status`.

---

## **Best Practices & Notes**

- **Image handling:**

  - Single → plain string.
  - Multiple → JSON array string.
  - Frontend tries `JSON.parse()` first.

- **Fetching Jerseys with Stock Info:**

```ts
const { data } = await supabase
  .from("jerseys")
  .select("*, jersey_stock(size, stock)");
```

- **Size logic:** only show sizes with `stock > 0`.
- **Quantity input:** restrict max to stock of selected size.
- **Reviews:** display stars using rating and show comment text.
- **Homepage sections:** query by `visible = true`, ordered by `order_index`.
- **Cart items:** always use `on conflict` to increment quantity instead of duplicating rows.

---

## **Recent Changes Implemented**

- Added `seller_requests` table + approval workflow.
- Split recent/old requests UI with instant movement on approve/reject.
- Optimized seller/buyer count queries in DB.
- Added **homepage modules system**:

  - `homepage_sections` and `homepage_products` tables
  - Create/edit/delete/reorder sections
  - Add/remove jerseys, reorder within section
  - Fetch latest jersey info dynamically

- Improved image handling logic for single/multiple images.
- Stock join query integrated for product listings.
- Frontend product page fully implemented with:

  - Multiple images carousel
  - Size selection based on `jersey_stock`
  - Stock-aware quantity input
  - Customer reviews display

- **NEW:** Added `cart_items` schema + flow.

---

✅ Now you have a **single source of truth** for the project including **cart & orders**.

Do you also want me to **generate an ERD diagram** (visual relationships between all tables) so you and your team can quickly reference it?
