import { Controller } from "@hotwired/stimulus"
import Rails from "@rails/ujs"

export default class extends Controller {
  static values = {
    id: String
  }

  addTag(event) {
    console.log("Adding tag for video ID:", this.idValue)
    event.preventDefault()
    Rails.ajax({
      type: 'POST',
      url: `/add_tag/${this.idValue}`
    })
  }
  removeTag(event) {
    console.log("Removing tag for video ID:", this.idValue)
    event.preventDefault()
    Rails.ajax({
      type: 'POST',
      url: `/remove_tag/${this.idValue}`
    })
  }

  destroyVideo(event) {
    console.log("Deleting video ID:", this.idValue)
    event.preventDefault()
    Rails.ajax({
      type: 'DELETE',
      url: `/destroy_video/${this.idValue}`,
      success: (_, status, xhr) => {
        // Trouver la div par data-video-id et la supprimer du DOM
        this.element.closest(`[data-video-id='${videoId}']`).remove();
        // Vous pourriez vouloir actualiser le carousel après la suppression
        // Si vous utilisez Swiper par exemple :
        // this.swiper.update(); // Supposant que `this.swiper` est votre instance Swiper
      }
    })
  }
}
