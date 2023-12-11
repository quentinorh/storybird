import { Controller } from "@hotwired/stimulus"
import Rails from "@rails/ujs"

export default class extends Controller {
  static values = {
    id: String
  }

  addTag(event) {
    console.log("Adding tag for video ID:", this.idValue);
    event.preventDefault();
    const button = event.target; // Récupère le bouton qui a déclenché l'événement

    Rails.ajax({
        type: 'POST',
        url: `/add_tag/${this.idValue}`,
        success: function(data) {
            console.log("Tag ajouté avec succès");
            button.classList.add("remove-tag-button"); // Ajoute une classe CSS au bouton
            button.classList.remove("add-tag-button"); // Supprime une autre classe si nécessaire
            button.setAttribute("data-action", "click->tag#removeTag");
        }
    });
  }

  removeTag(event) {
      console.log("Removing tag for video ID:", this.idValue);
      event.preventDefault();
      const button = event.target; // Récupère le bouton qui a déclenché l'événement

      Rails.ajax({
          type: 'POST',
          url: `/remove_tag/${this.idValue}`,
          success: function(data) {
              console.log("Tag retiré avec succès");
              button.classList.add("add-tag-button"); // Ajoute une classe CSS au bouton
              button.classList.remove("remove-tag-button"); // Supprime une autre classe si nécessaire
              button.setAttribute("data-action", "click->tag#addTag");
          }
      });
  }


  destroyVideo(event) {
    console.log("Deleting video ID:", this.idValue);
    event.preventDefault();

    // Ajouter un message de confirmation
    if (confirm("Êtes-vous sûr de vouloir supprimer cette vidéo ?")) {
        this.element.parentNode.remove();
        Rails.ajax({
            type: 'POST',
            url: `/destroy_video/${this.idValue}`,
            success: (_, status, xhr) => {

            }
        });
    } else {
        console.log("Suppression annulée");
    }
  }
}
