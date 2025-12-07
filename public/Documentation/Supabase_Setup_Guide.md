# Supabase Setup Guide
**Project:** Project Nidus
**Date:** 2025-11-15

---

## 📋 Overview

This guide will help you configure your existing Supabase project for Project Nidus.

---

## 🔑 Step 1: Get Your Supabase Credentials

Since you already have a Supabase account and project, you need to get your credentials:

### 1. Go to Supabase Dashboard
- Navigate to: [https://supabase.com/dashboard](https://supabase.com/dashboard)
- Sign in with your account
- Select your Project Nidus project (or the project you want to use)

### 2. Get API Credentials
- In your project dashboard, go to **Settings** (gear icon)
- Click on **API** in the left sidebar
- You'll see two important sections:

#### Project URL
```
https://xxxxxxxxxxxxx.supabase.co
```
Copy this URL

#### API Keys
- **anon/public key:** Used for client-side operations
- **service_role key:** Used for admin operations (keep secret!)

---

## 📝 Step 2: Update Your .env File

1. **Copy the template:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` file** and replace these values:

   ```env
   # Replace with your actual values
   VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here
   ```

3. **Save the file**

⚠️ **Important:** Never commit the `.env` file to Git! It's already in `.gitignore`.

---

## 🗄️ Step 3: Database Setup

Once your credentials are configured, we'll set up the database in **Day 2** of Phase 1 with:
- Core tables
- User management tables
- Audit system
- Row Level Security (RLS) policies

**For now**, just make sure you can connect to Supabase.

---

## ✅ Step 4: Verify Connection

To verify your Supabase connection works:

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Check the console** - you should see no Supabase connection errors

3. **If you see errors:**
   - Double-check your `VITE_SUPABASE_URL` is correct
   - Double-check your `VITE_SUPABASE_ANON_KEY` is correct
   - Make sure there are no extra spaces or quotes
   - Restart the dev server after changing .env

---

## 🔒 Security Best Practices

### ✅ DO:
- Keep your `.env` file local and never commit it
- Use the **anon key** for client-side operations
- Use the **service role key** ONLY for server-side/admin operations
- Enable Row Level Security (RLS) on all tables (we'll do this in Day 2)

### ❌ DON'T:
- Don't expose the service role key in client-side code
- Don't commit `.env` to Git
- Don't share your keys publicly

---

## 📊 Supabase Project Settings

### Recommended Settings:

#### Authentication
- **Email confirmations:** Enabled
- **Password requirements:** Strong (min 8 characters)
- **Session timeout:** 30 minutes (main app), 15 minutes (admin app)

#### Database
- **Region:** Choose closest to your users
- **Pooler mode:** Transaction (for better connection management)

#### API
- **Auto API documentation:** Enabled
- **Rate limiting:** Configure based on your needs

---

## 🔄 Next Steps

After setting up Supabase credentials:

1. ✅ Credentials configured in `.env`
2. ⏳ **Day 2:** Create database schema
3. ⏳ **Day 2:** Create core tables
4. ⏳ **Day 3:** Set up authentication
5. ⏳ **Week 4:** Set up admin application (separate project)

---

## ❓ Troubleshooting

### Problem: "Invalid API key" error
**Solution:**
- Verify you copied the entire key (they're long!)
- Make sure there are no extra spaces
- Check you're using the **anon key** not the service role key

### Problem: "Network error" when connecting
**Solution:**
- Check your internet connection
- Verify the `VITE_SUPABASE_URL` is correct
- Check Supabase status page: [status.supabase.com](https://status.supabase.com)

### Problem: ".env file not being read"
**Solution:**
- Restart your development server (`npm run dev`)
- Make sure the file is named exactly `.env` (not `.env.txt`)
- Make sure it's in the project root directory

---

## 📞 Support

If you encounter issues:

1. Check Supabase Documentation: [supabase.com/docs](https://supabase.com/docs)
2. Check Supabase Discord: [discord.supabase.com](https://discord.supabase.com)
3. Review this project's documentation in `/Documentation`

---

## ✅ Checklist

Before proceeding to Day 2:

- [ ] Supabase account exists and is accessible
- [ ] Project created in Supabase dashboard
- [ ] Project URL copied
- [ ] Anon key copied
- [ ] `.env` file created from `.env.example`
- [ ] Credentials added to `.env` file
- [ ] Development server starts without Supabase errors
- [ ] `.env` file is NOT committed to Git (check `.gitignore`)

---

**Status:** ✅ Ready for Day 2 Database Setup

**Last Updated:** 2025-11-15
