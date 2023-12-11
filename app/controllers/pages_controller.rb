require 'cloudinary'

class PagesController < ApplicationController
  skip_before_action :authenticate_user!, only: [:home]
  before_action :authenticate_user!, only: [:add_tag, :remove_tag, :destroy]

  def home
    @videos = Cloudinary::Api.resources(
      resource_type: 'video',
      type: 'upload',
      prefix: 'storybird1/',
      tags: true
    )['resources'].map do |video|
      {
        url: video['url'],
        created_at: video['created_at'],
        public_id: video['public_id'],
        is_favorite: video['tags'].include?('favoris') # Vérifier si la vidéo a le tag "favoris"
      }
    end.sort_by { |video| video[:created_at] }.reverse
  end

  def favorites
    # Récupérer toutes les vidéos avec le tag "favoris"
    tagged_videos = Cloudinary::Api.resources_by_tag(
      'favoris',
      resource_type: 'video',
      type: 'upload',
      prefix: 'storybird1/'
    )['resources']

    # Transformer les vidéos en un format utilisable par la vue
    @videos = tagged_videos.map do |video|
      {
        url: video['url'],
        created_at: video['created_at'],
        public_id: video['public_id'] # Utilisez cette ligne pour obtenir l'ID public de la vidéo
      }
    end.sort_by { |video| video[:created_at] }.reverse
  end


  def add_tag
    public_id = params[:id]
    tag = 'favoris'
    begin
      Cloudinary::Uploader.add_tag(tag, public_id, resource_type: :video)
      flash[:notice] = 'Tag added successfully.'
    rescue => e
      flash[:alert] = "There was a problem adding the tag: #{e.message}"
    end
    respond_to do |format|
      format.html { redirect_to root_path }
      format.js   # Rails va chercher un fichier .js.erb avec le même nom que l'action
    end
  end

  def remove_tag
    public_id = params[:id]
    tag = 'favoris'
    begin
      Cloudinary::Uploader.remove_tag(tag, public_id, resource_type: :video)
      flash[:notice] = 'Tag removed successfully.'
    rescue => e
      flash[:alert] = "There was a problem removing the tag: #{e.message}"
    end
    respond_to do |format|
      format.html { redirect_to root_path }
      format.js
    end
  end

  def destroy
    public_id = params[:id]
    begin
      Cloudinary::Uploader.destroy(public_id, resource_type: :video)
      flash[:notice] = 'Video deleted successfully.'
    rescue => e
      flash[:alert] = "There was a problem deleting the video: #{e.message}"
    end
    respond_to do |format|
      format.html { redirect_to root_path }
      format.js
    end
  end

end
