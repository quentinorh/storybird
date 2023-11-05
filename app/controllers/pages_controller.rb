require 'cloudinary'

class PagesController < ApplicationController
  skip_before_action :authenticate_user!, only: [:home]
  before_action :authenticate_user!, only: [:add_tag_to_video, :remove_tag_from_video]

  def home
    @videos = Cloudinary::Api.resources(
      resource_type: 'video',
      type: 'upload',
      prefix: 'storybird1/'
    )['resources'].map do |video|
      {
        url: video['url'],
        created_at: video['created_at'],
        public_id: video['public_id'] # Ajoutez cette ligne
      }
    end.sort_by { |video| video[:created_at] }.reverse
  end

  def destroy
    # Assurez-vous que l'utilisateur est authentifié
    unless user_signed_in?
      redirect_to new_user_session_path, alert: 'You must be signed in to do that.'
      return
    end

    public_id = params[:id]
    begin
      Cloudinary::Uploader.destroy(public_id, resource_type: :video)
      flash[:notice] = 'Video deleted successfully.'
    rescue => e
      flash[:alert] = 'There was a problem deleting the video.'
    end

    redirect_to root_path
  end

  def add_tag_to_video
    public_id = params[:id]
    tag = 'favoris'

    begin
      Cloudinary::Uploader.add_tag(tag, public_id, resource_type: :video)
      flash[:notice] = 'Tag added successfully.'
    rescue => e
      flash[:alert] = "There was a problem adding the tag: #{e.message}"
    end

    redirect_to root_path
  end

  def remove_tag_from_video
    public_id = params[:id]
    tag = 'favoris'

    begin
      Cloudinary::Uploader.remove_tag(tag, public_id, resource_type: :video)
      flash[:notice] = 'Tag removed successfully.'
    rescue => e
      flash[:alert] = "There was a problem removing the tag: #{e.message}"
    end

    redirect_to root_path
  end

end
