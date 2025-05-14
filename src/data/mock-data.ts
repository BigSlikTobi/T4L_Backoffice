export interface TableSchema {
  name: string;
  columns: string[];
  displayColumns?: string[]; // Optional: specify which columns to display in table
}

export interface TableData {
  [tableName: string]: Record<string, any>[];
}

export const mockTables: TableSchema[] = [
  { 
    name: 'users', 
    columns: ['id', 'name', 'email', 'role', 'created_at', 'last_login'],
    displayColumns: ['id', 'name', 'email', 'role'] 
  },
  { 
    name: 'products', 
    columns: ['id', 'name', 'price', 'description', 'stock', 'category', 'supplier_id'],
    displayColumns: ['id', 'name', 'price', 'stock', 'category'] 
  },
  { 
    name: 'orders', 
    columns: ['id', 'user_id', 'total_amount', 'status', 'order_date', 'shipping_address'],
    displayColumns: ['id', 'user_id', 'total_amount', 'status', 'order_date'] 
  },
];

export const mockData: TableData = {
  users: [
    { id: 1, name: 'Alice Wonderland', email: 'alice@example.com', role: 'admin', created_at: '2023-01-15T10:00:00Z', last_login: '2024-07-20T14:30:00Z' },
    { id: 2, name: 'Bob The Builder', email: 'bob@example.com', role: 'editor', created_at: '2023-02-20T11:30:00Z', last_login: '2024-07-19T09:15:00Z' },
    { id: 3, name: 'Charlie Chaplin', email: 'charlie@example.com', role: 'viewer', created_at: '2023-03-10T09:05:00Z', last_login: '2024-07-20T10:00:00Z' },
    { id: 4, name: 'Diana Prince', email: 'diana@example.com', role: 'editor', created_at: '2023-04-01T16:45:00Z', last_login: '2024-07-18T12:00:00Z' },
  ],
  products: [
    { id: 101, name: 'Laptop Pro X', price: 1499.99, description: 'High-performance laptop for professionals', stock: 25, category: 'Electronics', supplier_id: 12 },
    { id: 102, name: 'Wireless Ergonomic Mouse', price: 39.99, description: 'Comfortable and precise wireless mouse', stock: 150, category: 'Accessories', supplier_id: 15 },
    { id: 103, name: 'Mechanical Gaming Keyboard', price: 119.50, description: 'RGB backlit mechanical keyboard for gaming', stock: 70, category: 'Gaming', supplier_id: 12 },
    { id: 104, name: '4K UHD Monitor 27"', price: 349.00, description: '27-inch 4K Ultra HD Monitor', stock: 40, category: 'Electronics', supplier_id: 18 },
    { id: 105, name: 'Premium Coffee Beans 1kg', price: 22.00, description: 'Artisanal roasted coffee beans', stock: 300, category: 'Groceries', supplier_id: 21 },
  ],
  orders: [
    { id: 201, user_id: 1, total_amount: 1499.99, status: 'Shipped', order_date: '2024-07-15T08:30:00Z', shipping_address: '123 Main St, Wonderland' },
    { id: 202, user_id: 2, total_amount: 79.98, status: 'Processing', order_date: '2024-07-18T14:00:00Z', shipping_address: '456 Construct Ave, Builderville' },
    { id: 203, user_id: 1, total_amount: 119.50, status: 'Delivered', order_date: '2024-07-10T10:15:00Z', shipping_address: '123 Main St, Wonderland' },
    { id: 204, user_id: 3, total_amount: 349.00, status: 'Pending Payment', order_date: '2024-07-20T11:00:00Z', shipping_address: '789 Film Row, Hollywood' },
    { id: 205, user_id: 4, total_amount: 22.00, status: 'Shipped', order_date: '2024-07-19T16:20:00Z', shipping_address: 'Paradise Island, Themyscira' },
  ],
};

// Simulate API calls
export const fetchTables = async (): Promise<TableSchema[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockTables);
    }, 500);
  });
};

export const fetchTableData = async (tableName: string): Promise<Record<string, any>[]> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (mockData[tableName]) {
        resolve(mockData[tableName]);
      } else {
        reject(new Error('Table not found'));
      }
    }, 1000);
  });
};

export const updateTableRecord = async (tableName: string, record: Record<string, any>): Promise<Record<string, any>> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (mockData[tableName]) {
        const index = mockData[tableName].findIndex(r => r.id === record.id);
        if (index !== -1) {
          mockData[tableName][index] = { ...mockData[tableName][index], ...record };
          resolve(mockData[tableName][index]);
        } else {
          reject(new Error('Record not found'));
        }
      } else {
        reject(new Error('Table not found'));
      }
    }, 700);
  });
};
