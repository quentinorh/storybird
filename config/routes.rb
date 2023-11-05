Rails.application.routes.draw do
  devise_for :users
  root to: "pages#home"
  delete 'home/:id', to: 'pages#destroy', as: 'delete_video'
  post 'add_tag/:id', to: 'pages#add_tag_to_video', as: 'add_tag'
  post 'remove_tag/:id', to: 'pages#remove_tag_from_video', as: 'remove_tag'
end
