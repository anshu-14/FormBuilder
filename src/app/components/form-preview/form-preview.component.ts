import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormsModule ,ReactiveFormsModule} from '@angular/forms';
import { FormField } from '../../models/form-field';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-form-preview',
  imports: [CommonModule,ReactiveFormsModule],
  templateUrl: './form-preview.component.html',
  styleUrl: './form-preview.component.css'
})
export class FormPreviewComponent {
  @Input() fields: FormField[] = [];
  @Input() form!: FormGroup;
  @Input() selectedFieldId: string | null = null;
  @Output() fieldSelected = new EventEmitter<string>();

  submittedData: any = null;
  showSubmittedData = false;

  constructor(private toastService: ToastService) {}

  selectField(fieldId: string) {
    this.fieldSelected.emit(fieldId);
  }

  onSubmit() {
    if (this.form.valid) {
      this.submittedData = this.form.value;
      this.showSubmittedData = true;
      console.log('Form submitted:', this.form.value);
      this.toastService.success('Form submitted successfully!');
    } else {
      this.toastService.error('Please fill all required fields.');
    }
  }

  copyFullCode() {
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
        if (index < this.fields.length - 1) fullCode += ',';
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

    navigator.clipboard.writeText(fullCode).then(() => {
      this.toastService.success('Full form code copied to clipboard!');
    }).catch(() => {
      this.toastService.error('Failed to copy code to clipboard');
    });
  }

  private generateFieldCode(field: FormField): string {
    if (field.type === 'heading') {
      return `<h${field.level} class="text-${field.level === 1 ? '3xl' : field.level === 2 ? '2xl' : 'xl'} font-bold text-gray-900">${field.heading}</h${field.level}>`;
    }

    if (field.type === 'separator') {
      return `<hr class="border-gray-300">`;
    }

    let code = `<div>\n`;
    code += `  <label class="block text-sm font-medium text-gray-700 mb-1">\n`;
    code += `    ${field.label}${field.required ? ' <span class="text-red-500">*</span>' : ''}\n`;
    code += `  </label>\n`;

    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
        code += `  <input type="${field.type}" formControlName="${field.formControlName}"`;
        if (field.placeholder) code += ` placeholder="${field.placeholder}"`;
        code += ` class="w-full px-3 py-2 border border-gray-300 rounded-md">\n`;
        break;
      case 'textarea':
        code += `  <textarea formControlName="${field.formControlName}"`;
        if (field.placeholder) code += ` placeholder="${field.placeholder}"`;
        code += ` rows="4" class="w-full px-3 py-2 border border-gray-300 rounded-md"></textarea>\n`;
        break;
      case 'select':
        code += `  <select formControlName="${field.formControlName}" class="w-full px-3 py-2 border border-gray-300 rounded-md">\n`;
        code += `    <option value="">Select an option</option>\n`;
        field.options?.forEach(opt => {
          code += `    <option value="${opt}">${opt}</option>\n`;
        });
        code += `  </select>\n`;
        break;
      case 'checkbox':
        code = `<div class="flex items-center">\n`;
        code += `  <input type="checkbox" formControlName="${field.formControlName}" id="${field.formControlName}" class="h-4 w-4">\n`;
        code += `  <label for="${field.formControlName}" class="ml-2">${field.label}</label>\n`;
        break;
      case 'radio':
        code += `  <div class="space-y-2">\n`;
        field.options?.forEach((opt, idx) => {
          code += `    <div class="flex items-center">\n`;
          code += `      <input type="radio" formControlName="${field.formControlName}" value="${opt}" id="${field.formControlName}_${idx}">\n`;
          code += `      <label for="${field.formControlName}_${idx}" class="ml-2">${opt}</label>\n`;
          code += `    </div>\n`;
        });
        code += `  </div>\n`;
        break;
    }

    code += `</div>`;
    return code;
  }
}
