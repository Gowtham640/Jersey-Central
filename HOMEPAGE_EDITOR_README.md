# Homepage Editor - Admin Dashboard

## Overview

The Homepage Editor is a powerful admin tool that allows you to dynamically manage your website's homepage sections. Instead of hardcoded sections, you can now:

- **Create/Delete Sections**: Add new sections or remove existing ones
- **Toggle Visibility**: Hide/show sections without deleting them
- **Reorder Sections**: Drag and drop to change the display order
- **Manage Products**: Add/remove products from each section
- **Dynamic Content**: All changes are reflected immediately on the homepage

## Database Setup

Before using the homepage editor, you need to set up the required database tables. Run the following SQL commands in your Supabase SQL editor:

```sql
-- Run the contents of database-setup.sql
-- This will create the necessary tables and default sections
```

### Tables Created:

1. **`homepage_sections`**: Stores section information

   - `id`: Unique identifier
   - `title`: Section title (e.g., "Top Picks", "Best Deals")
   - `type`: Section type (top-picks, best-deals, new-arrivals, trending, custom)
   - `visible`: Boolean to show/hide section
   - `order_index`: Display order on homepage
   - `created_at`, `updated_at`: Timestamps

2. **`homepage_products`**: Links products to sections
   - `id`: Unique identifier
   - `section_id`: References homepage_sections.id
   - `jersey_id`: References jerseys.id
   - `order_index`: Product order within section

## Features

### 1. Section Management

#### Create New Section

- Click "Add Section" button
- Enter section title
- Choose section type
- Section is automatically added to the homepage

#### Section Types

- **Top Picks**: Featured products
- **Best Deals**: Discounted or promotional items
- **New Arrivals**: Recently added products
- **Trending**: Popular products
- **Custom**: User-defined sections

#### Toggle Visibility

- Use the eye icon to show/hide sections
- Hidden sections won't appear on the homepage
- Useful for seasonal offers or temporary promotions

#### Delete Section

- Click the trash icon to remove a section
- Confirmation dialog prevents accidental deletion
- All products in the section are also removed

### 2. Product Management

#### Add Products to Section

- Click the "+" icon on any section
- Search through available products
- Click "Add" to include products in the section
- Products automatically appear on the homepage

#### Remove Products

- Click the "X" icon on any product card
- Product is immediately removed from the section
- Product remains available in your inventory

#### Product Display

- Each section shows up to 3 products
- Products display: image, title, club, and price
- Responsive grid layout

### 3. Ordering and Layout

#### Section Order

- Sections are displayed in the order specified by `order_index`
- New sections are added at the end
- Reordering functionality coming soon

#### Product Order

- Products within sections are ordered by `order_index`
- New products are added at the end of the section

## Usage Guide

### Accessing the Editor

1. Navigate to `/admin/upload-product` (renamed to Homepage Editor)
2. You must be logged in as an admin user
3. The interface shows all current sections and their products

### Creating Your First Section

1. Click "Add Section"
2. Enter a title (e.g., "Featured Products")
3. Choose a type (e.g., "custom")
4. Click "Create Section"
5. Your new section appears on the homepage

### Adding Products to Sections

1. Click the "+" icon on any section
2. Use the search bar to find products
3. Click "Add" on products you want to include
4. Products immediately appear in the section

### Managing Section Visibility

1. Use the eye/eye-slash icon to toggle visibility
2. Hidden sections won't appear on the homepage
3. Perfect for seasonal promotions or temporary content

## Technical Details

### API Endpoints Used

- `GET /homepage_sections`: Fetch all sections with products
- `POST /homepage_sections`: Create new section
- `PUT /homepage_sections`: Update section (visibility, order)
- `DELETE /homepage_sections`: Remove section
- `POST /homepage_products`: Add product to section
- `DELETE /homepage_products`: Remove product from section

### Data Flow

1. **Admin Interface**: React components for managing sections
2. **Database**: Supabase tables store section and product data
3. **Homepage**: Dynamic rendering based on database content
4. **Real-time Updates**: Changes reflect immediately on the homepage

### Performance Considerations

- Sections are fetched once on page load
- Products are loaded with sections (eager loading)
- Search functionality filters client-side for responsiveness
- Database indexes optimize query performance

## Customization

### Adding New Section Types

1. Update the `type` field in the database schema
2. Modify the interface to include new types
3. Add any type-specific styling or behavior

### Styling Sections

- Each section uses Tailwind CSS classes
- Responsive design works on all screen sizes
- Product cards have consistent styling
- Easy to customize colors, spacing, and layout

### Extending Functionality

- Add drag-and-drop reordering
- Implement section templates
- Add analytics for section performance
- Create A/B testing for different layouts

## Troubleshooting

### Common Issues

1. **Sections not appearing**: Check if `visible` is set to `true`
2. **Products not loading**: Verify database relationships
3. **Permission errors**: Ensure user has admin access
4. **Styling issues**: Check Tailwind CSS classes

### Debug Mode

- Check browser console for error messages
- Verify database table structure
- Confirm Supabase connection
- Check user authentication status

## Future Enhancements

- **Drag & Drop Reordering**: Visual section reordering
- **Section Templates**: Pre-built section layouts
- **Analytics Dashboard**: Track section performance
- **Bulk Operations**: Mass add/remove products
- **Scheduled Publishing**: Set visibility timestamps
- **Multi-language Support**: Internationalized content

## Support

For technical support or feature requests:

1. Check the database setup
2. Verify user permissions
3. Review console errors
4. Contact the development team

---

**Note**: This homepage editor replaces the previous upload-product functionality. The URL remains the same for backward compatibility, but the interface and functionality have been completely redesigned.
