# 🏆 Jersey Marketplace

A modern, full-stack e-commerce platform for football jerseys built with Next.js, Supabase, and TailwindCSS. This platform connects jersey sellers with buyers, offering a seamless shopping experience with advanced features like seller approval workflows, inventory management, and secure payment processing.

## ✨ Features

### 🛍️ **E-commerce Core**

- **Product Catalog**: Browse jerseys by club, season, quality, and size
- **Smart Inventory**: Real-time stock tracking with size-based availability
- **Shopping Cart**: Add items, manage quantities, and proceed to checkout
- **Order Management**: Complete order lifecycle from cart to fulfillment

### 👨‍💼 **Seller Management**

- **Seller Approval System**: Admin-controlled seller registration workflow
- **Product Upload**: Multi-image support with drag-and-drop functionality
- **Inventory Control**: Real-time stock management and updates
- **Sales Analytics**: Comprehensive seller performance metrics
- **Store Profiles**: Customizable seller storefronts

### 🔐 **Authentication & Security**

- **Supabase Auth**: Secure user authentication with email verification
- **Role-Based Access**: Buyer, Seller, and Admin role management
- **Protected Routes**: Middleware-based route protection
- **Session Management**: Robust mobile-compatible session handling

### 📊 **Admin Dashboard**

- **Platform Analytics**: Revenue, orders, and user statistics
- **Seller Approval**: Manage seller registration requests
- **Product Moderation**: Oversee product quality and compliance
- **Homepage Management**: Dynamic section creation and product placement

### 🎨 **User Experience**

- **Responsive Design**: Mobile-first approach with TailwindCSS
- **Dynamic Homepage**: Admin-configurable product sections
- **Image Galleries**: Multi-image product displays with carousels
- **Search & Filters**: Advanced product discovery tools

## 🚀 Tech Stack

### **Frontend**

- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **TailwindCSS**: Utility-first CSS framework
- **Heroicons**: Beautiful SVG icon library

### **Backend & Database**

- **Supabase**: Open-source Firebase alternative
- **PostgreSQL**: Robust relational database
- **Row Level Security**: Database-level access control
- **Real-time Subscriptions**: Live data updates

### **Authentication & Storage**

- **Supabase Auth**: JWT-based authentication
- **Supabase Storage**: Image and file management
- **Session Management**: Multi-storage fallback system

### **Deployment & Hosting**

- **Vercel**: Next.js deployment platform
- **Environment Variables**: Secure configuration management

## 📁 Project Structure

```
jc3/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── admin/             # Admin dashboard & controls
│   │   ├── auth/              # Authentication pages
│   │   ├── buyer/             # Buyer shopping experience
│   │   ├── seller/            # Seller management
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Homepage
│   │   └── providers.tsx      # Context providers
│   ├── utils/                 # Utility functions
│   └── components/            # Reusable components
├── public/                    # Static assets
├── middleware.ts              # Route protection
├── next.config.ts             # Next.js configuration
└── tailwind.config.js         # TailwindCSS configuration
```

## 🗄️ Database Schema

### **Core Tables**

- **`users`**: User accounts with role-based access
- **`jerseys`**: Product catalog with metadata
- **`jersey_stock`**: Size-based inventory tracking
- **`seller_requests`**: Seller approval workflow
- **`cart_items`**: Shopping cart management
- **`orders`**: Order processing and fulfillment
- **`homepage_sections`**: Dynamic homepage content

### **Key Relationships**

- Users can be buyers, sellers, or admins
- Sellers upload jerseys with stock information
- Buyers add items to cart and create orders
- Admins manage platform operations

## 🚀 Getting Started

### **Prerequisites**

- Node.js 18+
- npm or yarn
- Supabase account

### **Installation**

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd jc3
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_SITE_URL=your_site_url
   ```

4. **Database Setup**

   - Set up Supabase project
   - Run database migrations
   - Configure RLS policies

5. **Start Development Server**

   ```bash
   npm run dev
   ```

6. **Build for Production**
   ```bash
   npm run build
   npm start
   ```

## 🔧 Configuration

### **Supabase Setup**

1. Create new Supabase project
2. Enable authentication providers
3. Set up storage buckets
4. Configure RLS policies
5. Add environment variables

### **TailwindCSS**

- Custom color palette
- Responsive breakpoints
- Component-specific utilities

### **Next.js**

- App Router configuration
- Image optimization
- API route handling

## 📱 Mobile Optimization

- **Responsive Design**: Mobile-first approach
- **Touch-Friendly**: Optimized for mobile interactions
- **Session Persistence**: Multi-storage fallback system
- **Performance**: Optimized images and lazy loading

## 🔒 Security Features

- **Authentication**: JWT-based user sessions
- **Authorization**: Role-based access control
- **Data Protection**: Row-level security policies
- **Input Validation**: Server-side validation
- **CSRF Protection**: Built-in Next.js security

## 🧪 Testing

```bash
# Run linting
npm run lint

# Type checking
npm run type-check

# Build verification
npm run build
```

## 📈 Performance

- **Image Optimization**: Next.js Image component
- **Code Splitting**: Automatic route-based splitting
- **Caching**: Strategic caching strategies
- **Bundle Analysis**: Optimized JavaScript bundles

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🎯 Roadmap

- [ ] Advanced search and filtering
- [ ] Payment gateway integration
- [ ] Real-time notifications
- [ ] Mobile app development
- [ ] Multi-language support
- [ ] Advanced analytics dashboard

---

**Built with ❤️ using Next.js, Supabase, and TailwindCSS**
