import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FieldConfigPanelComponent } from '../field-config-panel/field-config-panel.component';
import { FormPreviewComponent } from '../form-preview/form-preview.component';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormField } from '../../models/form-field';

@Component({
  selector: 'app-form-builder',
  imports: [CommonModule,FieldConfigPanelComponent,FormPreviewComponent],
  templateUrl: './form-builder.component.html',
  styleUrl: './form-builder.component.css'
})
export class FormBuilderComponent {
  fieldTypes = [
    { type: 'text' as const, label: 'Text Input', icon: '📝' },
    { type: 'email' as const, label: 'Email Input', icon: '📧' },
    { type: 'number' as const, label: 'Number Input', icon: '🔢' },
    { type: 'textarea' as const, label: 'Textarea', icon: '📄' },
    { type: 'select' as const, label: 'Select Dropdown', icon: '📋' },
    { type: 'checkbox' as const, label: 'Checkbox', icon: '☑️' },
    { type: 'radio' as const, label: 'Radio Button', icon: '🔘' },
    { type: 'heading' as const, label: 'Heading', icon: '📰' },
    { type: 'separator' as const, label: 'Separator', icon: '➖' }
  ];

  formFields: FormField[] = [];
  selectedField: FormField | null = null;
  previewForm: FormGroup;
  private fieldCounter = 0;
  private fieldFormControlMap: Map<string, string> = new Map(); // Maps field id to form control name

  constructor(private fb: FormBuilder) {
    this.previewForm = this.fb.group({});
  }

  addField(type: FormField['type']) {
    this.fieldCounter++;
    const field: FormField = {
      id: `field_${this.fieldCounter}`,
      type,
      label: this.getDefaultLabel(type),
      formControlName: `field_${this.fieldCounter}`,
      placeholder: type !== 'checkbox' && type !== 'heading' && type !== 'separator' 
        ? `Enter ${this.getDefaultLabel(type).toLowerCase()}` 
        : undefined,
      required: false,
      options: type === 'select' || type === 'radio' ? ['Option 1', 'Option 2', 'Option 3'] : undefined,
      heading: type === 'heading' ? 'Section Heading' : undefined,
      level: type === 'heading' ? 2 : undefined
    };

    this.formFields.push(field);
    
    if (type !== 'heading' && type !== 'separator') {
      this.previewForm.addControl(field.formControlName, this.fb.control(''));
      this.fieldFormControlMap.set(field.id, field.formControlName);
    }
    
    this.selectedField = field;
  }

  getDefaultLabel(type: string): string {
    const labels: { [key: string]: string } = {
      text: 'Text Field',
      email: 'Email Address',
      number: 'Number',
      textarea: 'Text Area',
      select: 'Select Option',
      checkbox: 'Checkbox Option',
      radio: 'Radio Option',
      heading: 'Heading',
      separator: 'Separator'
    };
    return labels[type] || 'Field';
  }

  onFieldSelected(fieldId: string) {
    this.selectedField = this.formFields.find(f => f.id === fieldId) || null;
  }

  onFieldChanged() {
    if (this.selectedField && this.selectedField.type !== 'heading' && this.selectedField.type !== 'separator') {
      const oldFormControlName = this.fieldFormControlMap.get(this.selectedField.id);
      const newFormControlName = this.selectedField.formControlName;
      
      // If form control name changed, update the reactive form
      if (oldFormControlName && oldFormControlName !== newFormControlName) {
        const oldControl = this.previewForm.get(oldFormControlName);
        if (oldControl) {
          const value = oldControl.value;
          const validators = this.selectedField.required ? [Validators.required] : [];
          
          // Remove old control
          this.previewForm.removeControl(oldFormControlName);
          
          // Add new control with same value and validators
          this.previewForm.addControl(newFormControlName, this.fb.control(value, validators));
          
          // Update the map
          this.fieldFormControlMap.set(this.selectedField.id, newFormControlName);
        }
      } else {
        // Just update validators if form control name didn't change
        const validators = this.selectedField.required ? [Validators.required] : [];
        const control = this.previewForm.get(this.selectedField.formControlName);
        if (control) {
          control.setValidators(validators);
          control.updateValueAndValidity();
        }
      }
    }
  }

  removeField() {
    if (this.selectedField) {
      this.removeFieldById(this.selectedField.id);
    }
  }

  removeFieldById(fieldId: string) {
    const field = this.formFields.find(f => f.id === fieldId);
    if (field) {
      const index = this.formFields.findIndex(f => f.id === fieldId);
      if (index > -1) {
        if (field.type !== 'heading' && field.type !== 'separator') {
          this.previewForm.removeControl(field.formControlName);
          this.fieldFormControlMap.delete(fieldId);
        }
        this.formFields.splice(index, 1);
        if (this.selectedField?.id === fieldId) {
          this.selectedField = null;
        }
      }
    }
  }

  onFieldEdit(fieldId: string) {
    if (fieldId) {
      this.selectedField = this.formFields.find(f => f.id === fieldId) || null;
    } else {
      this.selectedField = null;
    }
  }
  onCodeCopied(code: string) {
    console.log('Code copied:', code);
    
    // Copy to clipboard
    navigator.clipboard.writeText(code)
      .then(() => {
        // Show success message/notification
        console.log('Successfully copied to clipboard');
        
        // Optional: Show a temporary success indicator
        
      })
      .catch((error) => {
        // Handle error
        console.error('Failed to copy to clipboard:', error);
        
        
        
      });
  }
}




