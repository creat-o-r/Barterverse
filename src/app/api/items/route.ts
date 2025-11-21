import { NextRequest, NextResponse } from 'next/server';
import { dummyItems } from '@/lib/dummy-data';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const listingType = searchParams.get('listingType');
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const ownerId = searchParams.get('ownerId');
    const searchTerm = searchParams.get('search');
    
    // Filter items based on query parameters
    let filteredItems = dummyItems;
    
    if (listingType) {
      filteredItems = filteredItems.filter(item => item.listingType === listingType);
    }
    
    if (category) {
      filteredItems = filteredItems.filter(item => item.category === category);
    }
    
    if (status) {
      filteredItems = filteredItems.filter(item => item.status === status);
    }
    
    if (ownerId) {
      filteredItems = filteredItems.filter(item => item.ownerId === ownerId);
    }
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filteredItems = filteredItems.filter(item => 
        item.name.toLowerCase().includes(search) ||
        item.description.toLowerCase().includes(search) ||
        item.category.toLowerCase().includes(search)
      );
    }
    
    return NextResponse.json({
      items: filteredItems,
      total: filteredItems.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching items:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch items',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Basic validation
    if (!body.name || !body.description || !body.category || !body.ownerId) {
      return NextResponse.json(
        { error: 'Missing required fields: name, description, category, ownerId' },
        { status: 400 }
      );
    }
    
    // In a real app, you would save to database here
    // For now, we'll just return success
    const newItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ...body,
      status: 'available',
      createdAt: new Date().toISOString()
    };
    
    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error('Error creating item:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create item',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}