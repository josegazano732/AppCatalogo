export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  unit_of_measure?: string;
  category_name?: string;
  category?: string;
}
