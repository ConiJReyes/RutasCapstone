from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny

from django.http import Http404

from usuarios.models import Furgon
from usuarios.serializers import FurgonSerializer

class FurgonListCreateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        furgones = Furgon.objects.all().order_by('-id')
        serializer = FurgonSerializer(furgones, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = FurgonSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class FurgonDetailView(APIView):
    permission_classes = [AllowAny]

    def get_object(self, pk):
        try:
            return Furgon.objects.get(pk=pk)
        except Furgon.DoesNotExist:
            raise Http404

    def get(self, request, pk):
        furgon = self.get_object(pk)
        serializer = FurgonSerializer(furgon)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk):
        furgon = self.get_object(pk)
        serializer = FurgonSerializer(furgon, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        furgon = self.get_object(pk)
        furgon.delete()
        return Response({'message': 'Furgón eliminado.'}, status=status.HTTP_204_NO_CONTENT)
