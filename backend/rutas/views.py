from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny

from django.http import Http404

from usuarios.models import Ruta
from usuarios.serializers import RutaSerializer

class RutaListCreateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        rutas = Ruta.objects.all().order_by('-id')
        serializer = RutaSerializer(rutas, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        data = request.data.copy()
        data['colegio'] = 'Escuela Bosques del Viento'
        serializer = RutaSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class RutaDetailView(APIView):
    permission_classes = [AllowAny]

    def get_object(self, pk):
        try:
            return Ruta.objects.get(pk=pk)
        except Ruta.DoesNotExist:
            raise Http404

    def get(self, request, pk):
        ruta = self.get_object(pk)
        serializer = RutaSerializer(ruta)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk):
        ruta = self.get_object(pk)
        data = request.data.copy()
        data['colegio'] = 'Escuela Bosques del Viento'
        serializer = RutaSerializer(ruta, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        ruta = self.get_object(pk)
        ruta.delete()
        return Response({'message': 'Ruta eliminada.'}, status=status.HTTP_204_NO_CONTENT)

