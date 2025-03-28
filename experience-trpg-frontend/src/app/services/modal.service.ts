import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'; // Exemplo de biblioteca de modais

@Injectable({
    providedIn: 'root'
})
export class ModalService {
    constructor(private modalService: NgbModal) { }

    open(component: any): void {
        const modalRef = this.modalService.open(component);
        // Você pode realizar outras ações com modalRef se necessário
    }
}
