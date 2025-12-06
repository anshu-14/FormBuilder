export type FieldType = 'text' | 'textarea' | 'select' | 'checkbox' | 'heading' | 'separator' | 'number' | 'email' | 'radio';

export interface FormField {
  id: string;                
  type: FieldType;
  label?: string;
  formControlName: string;              
  placeholder?: string;
  required?: boolean;
  options?: string[];        
  heading?: string;
  level?: number;
}
