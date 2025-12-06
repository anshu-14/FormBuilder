import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormField } from '../../models/form-field';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-field-config-panel',
  imports: [CommonModule, FormsModule],
  templateUrl: './field-config-panel.component.html',
  styleUrl: './field-config-panel.component.css'
})
export class FieldConfigPanelComponent implements OnChanges {
  @Input() fields: FormField[] = [];
  @Input() selectedField: FormField | null = null;
  @Output() fieldChanged = new EventEmitter<void>();
  @Output() fieldRemoved = new EventEmitter<string>();
  @Output() fieldEdit = new EventEmitter<string>();
  @Output() codeCopied = new EventEmitter<string>();

  constructor(private toastService: ToastService) {}

  editingField: FormField | null = null;
  optionsString = '';
  lastClickedFieldId: string | null = null;
  clickTimeout: any = null;
  oldFormControlName: string = '';
  showCode: boolean = false;
  generatedCode: string = '';

  ngOnChanges(changes: SimpleChanges) {
    // Don't automatically open modal when selectedField changes
    // Modal will only open on explicit edit (double-click)
    if (changes['selectedField'] && !this.selectedField) {
      // Only clear editingField if selectedField is cleared
      this.editingField = null;
      this.optionsString = '';
    }
  }

  editField(fieldId: string) {
    // Edit button click - open modal immediately
    this.openEditModal(fieldId);
  }

  openEditModal(fieldId: string) {
    const field = this.fields.find(f => f.id === fieldId);
    if (field) {
      this.editingField = { ...field };
      this.oldFormControlName = field.formControlName; // Store old form control name
      if (this.editingField.options) {
        this.optionsString = this.editingField.options.join(', ');
      } else {
        this.optionsString = '';
      }
      // Also emit to select field in preview
      this.fieldEdit.emit(fieldId);
    }
  }

  getFieldDisplayName(field: FormField): string {
    if (field.type === 'heading') {
      return field.heading || 'Heading';
    }
    if (field.type === 'separator') {
      return 'Separator';
    }
    return field.label || field.formControlName || 'Unnamed Field';
  }

  getFieldTypeIcon(field: FormField): string {
    const icons: { [key: string]: string } = {
      text: '📝',
      email: '📧',
      number: '🔢',
      textarea: '📄',
      select: '📋',
      checkbox: '☑️',
      radio: '🔘',
      heading: '📰',
      separator: '➖'
    };
    return icons[field.type] || '📌';
  }

  onFieldChange() {
    if (this.editingField) {
      // Find and update the original field in the fields array
      const originalField = this.fields.find(f => f.id === this.editingField!.id);
      if (originalField) {
        Object.assign(originalField, this.editingField);
        this.fieldChanged.emit();
      }
    }
  }

  onFormControlChange() {
    if (this.editingField) {
      // Find and update the original field in the fields array
      const originalField = this.fields.find(f => f.id === this.editingField!.id);
      if (originalField) {
        const newFormControlName = this.editingField.formControlName;
        const oldFormControlName = this.oldFormControlName;
        
        // Update the field
        Object.assign(originalField, this.editingField);
        
        // If form control name changed, emit with old and new names
        if (newFormControlName !== oldFormControlName) {
          this.fieldChanged.emit();
          // Update stored old name for next change
          this.oldFormControlName = newFormControlName;
        } else {
          this.fieldChanged.emit();
        }
      }
    }
  }

  updateOptions() {
    if (this.editingField) {
      this.editingField.options = this.optionsString.split(',').map(opt => opt.trim()).filter(opt => opt);
      // Find and update the original field in the fields array
      const originalField = this.fields.find(f => f.id === this.editingField!.id);
      if (originalField) {
        Object.assign(originalField, this.editingField);
      }
      this.fieldChanged.emit();
    }
  }

  remove(fieldId: string) {
    this.fieldRemoved.emit(fieldId);
    if (this.editingField?.id === fieldId) {
      this.editingField = null;
    }
  }

  copyCode() {
    if (this.editingField) {
      const code = this.generateFieldCode(this.editingField);
      navigator.clipboard.writeText(code).then(() => {
        this.toastService.success('Field code copied to clipboard!');
      }).catch(() => {
        this.toastService.error('Failed to copy code to clipboard');
      });
      this.codeCopied.emit(code);
    }
  }

  cancelEdit() {
    this.editingField = null;
    this.fieldEdit.emit('');
  }

  saveField() {
    if (this.editingField) {
      // Update all field properties
      const originalField = this.fields.find(f => f.id === this.editingField!.id);
      if (originalField) {
        const oldFormControlName = this.oldFormControlName;
        const newFormControlName = this.editingField.formControlName;
        
        // Update the field
        Object.assign(originalField, this.editingField);
        
        // If form control name changed, we need to handle it
        if (oldFormControlName && oldFormControlName !== newFormControlName) {
          this.oldFormControlName = newFormControlName;
        }
        
        // Emit change event
        this.fieldChanged.emit();
        
        // Close modal
        this.cancelEdit();
      }
    }
  }

  closeModal(event: Event) {
    // Close modal when clicking on the backdrop
    if (event.target === event.currentTarget) {
      this.cancelEdit();
    }
  }

  showCodeModal() {
    this.generatedCode = this.generateFullFormCode();
    this.showCode = true;
  }

  closeCodeModal() {
    this.showCode = false;
  }

  copyFullCode() {
    navigator.clipboard.writeText(this.generatedCode).then(() => {
      this.toastService.success('Code copied to clipboard!');
    }).catch(() => {
      this.toastService.error('Failed to copy code to clipboard');
    });
  }

  private generateFullFormCode(): string {
    let fullCode = `// Component TypeScript\n`;
    fullCode += `import { Component } from '@angular/core';\n`;
    fullCode += `import { FormBuilder, FormGroup, Validators } from '@angular/forms';\n\n`;
    fullCode += `form: FormGroup;\n\n`;
    fullCode += `constructor(private fb: FormBuilder) {\n`;
    fullCode += `  this.form = this.fb.group({\n`;
    
    this.fields.forEach((field, index) => {
      if (field.type !== 'heading' && field.type !== 'separator') {
        const validator = field.required ? ', Validators.required' : '';
        fullCode += `    ${field.formControlName}: [''${validator}]`;
        const remainingFields = this.fields.filter((f, i) => i > index && f.type !== 'heading' && f.type !== 'separator');
        if (remainingFields.length > 0) fullCode += ',';
        fullCode += '\n';
      }
    });
    
    fullCode += `  });\n}\n\n`;
    fullCode += `// Component Template\n`;
    fullCode += `<form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-6">\n`;
    
    this.fields.forEach(field => {
      const fieldCode = this.generateFieldCode(field);
      fullCode += `  ${fieldCode.replace(/\n/g, '\n  ')}\n\n`;
    });
    
    fullCode += `  <button type="submit" class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md">Submit</button>\n`;
    fullCode += `</form>`;
    
    return fullCode;
  }

  generateFieldCode(field: FormField): string {
    if (field.type === 'heading') {
      return `<h${field.level} class="text-${field.level === 1 ? '3xl' : field.level === 2 ? '2xl' : 'xl'} font-bold text-white">${field.heading}</h${field.level}>`;
    }

    if (field.type === 'separator') {
      return `<hr class="border-gray-600">`;
    }

    let code = `<div>\n`;
    code += `  <label class="block text-sm font-medium text-gray-300 mb-1">\n`;
    code += `    ${field.label}${field.required ? ' <span class="text-red-400">*</span>' : ''}\n`;
    code += `  </label>\n`;

    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
        code += `  <input\n`;
        code += `    type="${field.type}"\n`;
        code += `    formControlName="${field.formControlName}"\n`;
        if (field.placeholder) code += `    placeholder="${field.placeholder}"\n`;
        code += `    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"\n`;
        code += `  >\n`;
        break;

      case 'textarea':
        code += `  <textarea\n`;
        code += `    formControlName="${field.formControlName}"\n`;
        if (field.placeholder) code += `    placeholder="${field.placeholder}"\n`;
        code += `    rows="4"\n`;
        code += `    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"\n`;
        code += `  ></textarea>\n`;
        break;

      case 'select':
        code += `  <select\n`;
        code += `    formControlName="${field.formControlName}"\n`;
        code += `    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"\n`;
        code += `  >\n`;
        code += `    <option value="">Select an option</option>\n`;
        field.options?.forEach(opt => {
          code += `    <option value="${opt}">${opt}</option>\n`;
        });
        code += `  </select>\n`;
        break;

      case 'checkbox':
        code = `<div class="flex items-center">\n`;
        code += `  <input\n`;
        code += `    type="checkbox"\n`;
        code += `    formControlName="${field.formControlName}"\n`;
        code += `    id="${field.formControlName}"\n`;
        code += `    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 bg-gray-700 rounded"\n`;
        code += `  >\n`;
        code += `  <label for="${field.formControlName}" class="ml-2 block text-sm text-gray-300">\n`;
        code += `    ${field.label}${field.required ? ' <span class="text-red-400">*</span>' : ''}\n`;
        code += `  </label>\n`;
        break;

      case 'radio':
        code += `  <div class="space-y-2">\n`;
        field.options?.forEach((opt, idx) => {
          code += `    <div class="flex items-center">\n`;
          code += `      <input\n`;
          code += `        type="radio"\n`;
          code += `        formControlName="${field.formControlName}"\n`;
          code += `        value="${opt}"\n`;
          code += `        id="${field.formControlName}_${idx}"\n`;
          code += `        class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 bg-gray-700"\n`;
          code += `      >\n`;
          code += `      <label for="${field.formControlName}_${idx}" class="ml-2 block text-sm text-gray-300">\n`;
          code += `        ${opt}\n`;
          code += `      </label>\n`;
          code += `    </div>\n`;
        });
        code += `  </div>\n`;
        break;
    }

    code += `</div>`;
    return code;
  }
}
