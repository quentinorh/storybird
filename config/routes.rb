Rails.application.routes.draw do
  devise_for :users
  root to: "pages#home"
  get 'favorites', to: 'pages#favorites', as: 'favorites'

  # Vous pouvez conserver la route pour supprimer une vidéo si vous utilisez déjà cette action
  # delete 'home/:id', to: 'pages#destroy', as: 'delete_video'

  # Les routes pour ajouter et retirer un tag, avec des contraintes pour permettre les caractères spéciaux dans l'id
  post 'add_tag/*id', to: 'pages#add_tag', as: 'add_tag', constraints: { id: /.+/ }
  post 'remove_tag/*id', to: 'pages#remove_tag', as: 'remove_tag', constraints: { id: /.+/ }

  # Notez que nous utilisons la méthode HTTP DELETE pour la suppression de vidéos, cela est cohérent avec les conventions RESTful
  post 'destroy_video/*id', to: 'pages#destroy', as: 'destroy_video', constraints: { id: /.+/ }
end
